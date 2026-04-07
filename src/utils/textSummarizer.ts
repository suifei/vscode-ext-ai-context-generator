/**
 * Text summarization utilities using TextRank-like algorithm
 * Supports UTF-8/Unicode and extracts meaningful summaries without simple truncation
 */

interface Sentence {
  text: string;
  index: number;
  position: number;
}

interface ScoredSentence extends Sentence {
  score: number;
}

interface SentenceSimilarity {
  sentence1: number;
  sentence2: number;
  similarity: number;
}

/**
 * Clean text by removing excessive whitespace and empty lines
 */
export function cleanText(text: string): string {
  if (!text) return '';

  // Normalize line breaks
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split into lines and clean each line
  const lines = text.split('\n').map(line => {
    // Trim leading/trailing whitespace
    let cleaned = line.trim();
    // Remove excessive internal whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');
    return cleaned;
  });

  // Remove empty lines and rejoin
  const nonEmptyLines = lines.filter(line => line.length > 0);

  return nonEmptyLines.join('\n');
}

/**
 * Split text into sentences (supports Chinese and English)
 */
export function splitIntoSentences(text: string): string[] {
  if (!text) return [];

  const sentences: string[] = [];

  // Split by sentence delimiters (Chinese and English)
  // Chinese delimiters: 。！？；\n
  // English delimiters: . ! ? ; \n
  const sentenceRegex = /[^。！？.!?;；\n]+[。！？.!?;；]?\n?|[^。！？.!?;；\n]+/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = sentenceRegex.exec(text)) !== null) {
    const sentence = match[0].trim();
    if (sentence.length > 0) {
      sentences.push(sentence);
    }
    lastIndex = sentenceRegex.lastIndex;
  }

  // Handle remaining text
  if (lastIndex < text.length) {
    const remaining = text.substring(lastIndex).trim();
    if (remaining.length > 0) {
      sentences.push(remaining);
    }
  }

  return sentences;
}

/**
 * Calculate similarity between two sentences using Jaccard similarity
 * This works well with Unicode/UTF-8 text
 */
export function calculateSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;

  // Tokenize into words (handles both Chinese and English)
  // For Chinese, we treat each character as a potential word unit
  // For English, we split by spaces and punctuation
  const tokenize = (text: string): Set<string> => {
    const tokens: string[] = [];

    // For English-like content: split by non-word characters
    const words = text.toLowerCase().split(/[^a-zA-Z0-9\u4e00-\u9fa5]+/);
    for (const word of words) {
      if (word.length > 0) {
        // Add the full word
        tokens.push(word);
        // For Chinese text, also add individual characters
        if (/[\u4e00-\u9fa5]/.test(word)) {
          for (const char of word) {
            tokens.push(char);
          }
        }
      }
    }

    return new Set(tokens);
  };

  const tokens1 = tokenize(s1);
  const tokens2 = tokenize(s2);

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  // Jaccard similarity: |intersection| / |union|
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size;
}

/**
 * Build similarity matrix for sentences
 */
function buildSimilarityMatrix(sentences: string[]): number[][] {
  const n = sentences.length;
  const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        matrix[i][j] = calculateSimilarity(sentences[i], sentences[j]);
      }
    }
  }

  return matrix;
}

/**
 * Calculate sentence scores using TextRank algorithm
 */
function calculateScores(similarityMatrix: number[][], dampingFactor = 0.85, iterations = 50, tolerance = 0.0001): number[] {
  const n = similarityMatrix.length;
  const scores: number[] = Array(n).fill(1);

  for (let iter = 0; iter < iterations; iter++) {
    const newScores: number[] = Array(n).fill(0);
    let maxChange = 0;

    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const rowSum = similarityMatrix[j].reduce((a, b) => a + b, 0);
          if (rowSum > 0) {
            sum += (similarityMatrix[j][i] / rowSum) * scores[j];
          }
        }
      }
      newScores[i] = (1 - dampingFactor) + dampingFactor * sum;
      maxChange = Math.max(maxChange, Math.abs(newScores[i] - scores[i]));
    }

    scores.splice(0, n, ...newScores);

    if (maxChange < tolerance) break;
  }

  return scores;
}

/**
 * Summarize text using TextRank algorithm
 * @param text - Input text to summarize
 * @param maxLength - Maximum length of summary in characters
 * @param minSentences - Minimum number of sentences to include
 * @returns Summarized text
 */
export function summarizeText(text: string, maxLength: number, minSentences = 3): string {
  // Clean text first
  const cleaned = cleanText(text);

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  // Split into sentences
  const sentences = splitIntoSentences(cleaned);

  if (sentences.length <= minSentences) {
    return cleaned;
  }

  // Build similarity matrix and calculate scores
  const similarityMatrix = buildSimilarityMatrix(sentences);
  const scores = calculateScores(similarityMatrix);

  // Sort sentences by score and select top ones
  const scoredSentences: ScoredSentence[] = sentences.map((text, index) => ({
    text,
    index,
    position: index,
    score: scores[index]
  }));

  // Sort by score (descending)
  scoredSentences.sort((a, b) => b.score - a.score);

  // Select sentences until we reach max length
  const selectedSentences: Sentence[] = [];
  let currentLength = 0;

  for (const sentence of scoredSentences) {
    const sentenceWithPunctuation = sentence.text;
    if (currentLength + sentenceWithPunctuation.length <= maxLength || selectedSentences.length < minSentences) {
      selectedSentences.push(sentence);
      currentLength += sentenceWithPunctuation.length;
    }
    if (currentLength >= maxLength && selectedSentences.length >= minSentences) {
      break;
    }
  }

  // Sort by original position to maintain flow
  selectedSentences.sort((a, b) => a.position - b.position);

  // Reconstruct summary
  const summary = selectedSentences.map(s => s.text).join('\n');

  return summary;
}

/**
 * Extract key sentences with their positions
 * Useful for document outlines where position matters
 */
export function extractKeySentences(
  text: string,
  numSentences: number,
  minSentenceLength = 10
): Array<{ text: string; position: number; score: number }> {
  const cleaned = cleanText(text);
  const sentences = splitIntoSentences(cleaned);

  // Filter out very short sentences
  const validSentences = sentences.filter(s => s.length >= minSentenceLength);

  if (validSentences.length <= numSentences) {
    return validSentences.map((text, index) => ({ text, position: index, score: 1 }));
  }

  const similarityMatrix = buildSimilarityMatrix(validSentences);
  const scores = calculateScores(similarityMatrix);

  const scored = validSentences.map((text, index) => ({
    text,
    position: sentences.indexOf(text), // Original position in all sentences
    score: scores[index]
  }));

  // Sort by score and take top N
  scored.sort((a, b) => b.score - a.score);
  const topSentences = scored.slice(0, numSentences);

  // Sort by position
  topSentences.sort((a, b) => a.position - b.position);

  return topSentences;
}

/**
 * Summarize text into sections with their key points
 * Useful for multi-section documents
 */
export interface SectionSummary {
  title: string;
  summary: string;
  keyPoints: string[];
}

export function summarizeSections(
  text: string,
  sectionDelimiter: RegExp,
  maxLengthPerSection: number
): SectionSummary[] {
  const cleaned = cleanText(text);
  const sections = cleaned.split(sectionDelimiter);

  const summaries: SectionSummary[] = [];

  for (const section of sections) {
    if (!section.trim()) continue;

    const lines = section.split('\n');
    const title = lines[0].trim() || 'Untitled Section';
    const content = lines.slice(1).join('\n');

    if (content.length < 50) continue;

    const summary = summarizeText(content, maxLengthPerSection, 2);
    const keySentences = extractKeySentences(content, 3);

    summaries.push({
      title,
      summary,
      keyPoints: keySentences.map(s => s.text)
    });
  }

  return summaries;
}
