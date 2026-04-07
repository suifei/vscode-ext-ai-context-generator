/**
 * Word (.docx) analyzer: text extraction with paragraph structure
 */

import * as fs from 'fs';
import * as path from 'path';
import * as mammoth from 'mammoth';
import { FileReadResult } from '../core/fileReader';
import { AIContextConfig, WARNING_EMOJI, SECTION_SEPARATOR } from '../config/constants';
import { getRelativePath } from '../utils/fileUtils';
import { getErrorMessage } from '../utils/errorUtils';
import { Logger } from '../core/logger';
import { cleanText, summarizeText, extractKeySentences } from '../utils/textSummarizer';

interface WordParagraph {
  type: 'heading' | 'normal';
  level?: number;
  content: string;
}

export class WordAnalyzer {
  constructor(
    private config: AIContextConfig,
    private workspaceRoot: string
  ) {}

  async summarize(fileResult: FileReadResult): Promise<string> {
    const relativePath = getRelativePath(this.workspaceRoot, fileResult.path);
    const ext = path.extname(fileResult.path).toLowerCase();

    // Check if file is .docx (old .doc format not supported)
    if (ext !== '.docx') {
      return `// File: ${relativePath} (${WARNING_EMOJI} Unsupported Word format. Only .docx is supported, not .doc)\n`;
    }

    try {
      // Read Word file using mammoth - extract full text first
      const dataBuffer = fs.readFileSync(fileResult.path);
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      let fullText = result.value;

      // Check for conversion warnings
      if (result.messages.length > 0) {
        Logger.debug(`Mammoth warnings for ${fileResult.path}: ${JSON.stringify(result.messages)}`);
      }

      // Clean the extracted text
      fullText = cleanText(fullText);
      const textLength = fullText.length;

      // Check if file exceeds size threshold AND compression is enabled
      const shouldCompress = fileResult.size > this.config.maxFileSize && this.config.enableLargeFileDegradation;

      let output = `// File: ${relativePath} (${WARNING_EMOJI} Word document structure)\n`;
      output += `// Total text: ~${textLength} chars\n`;

      if (shouldCompress) {
        output += `// Compressed: Yes (exceeds ${this.config.textPreviewLength} chars threshold)\n`;
      } else {
        output += `// Compressed: No\n`;
      }
      output += '\n';

      // Add section separator
      output += `${SECTION_SEPARATOR}\n`;
      output += `// DOCUMENT STRUCTURE\n`;
      output += `${SECTION_SEPARATOR}\n\n`;

      // Parse paragraphs and headings
      const paragraphs = this.parseParagraphs(fullText);

      if (shouldCompress) {
        // Large file: use smart summarization
        output += this.buildSummaryOutput(relativePath, fullText, paragraphs, textLength);
      } else {
        // Small file: show all content
        output += this.buildFullOutput(relativePath, fullText, paragraphs, textLength);
      }

      return output;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      Logger.warn(`Error parsing Word document ${fileResult.path}: ${message}`);
      return `// File: ${relativePath} (${WARNING_EMOJI} Word document parse error)\n// Error: ${message}\n`;
    }
  }

  /**
   * Parse paragraphs from text
   * Word documents use double newlines to separate paragraphs
   */
  private parseParagraphs(text: string): WordParagraph[] {
    const paragraphs: WordParagraph[] = [];

    // Split by double newlines (Word paragraph separator)
    const rawParagraphs = text.split(/\n\s*\n/);

    for (const para of rawParagraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      // Detect potential headings (short, possibly followed by colon, or all caps)
      const isHeading = this.isHeading(trimmed);

      paragraphs.push({
        type: isHeading ? 'heading' : 'normal',
        level: isHeading ? this.estimateHeadingLevel(trimmed) : undefined,
        content: trimmed
      });
    }

    return paragraphs;
  }

  /**
   * Heuristic to detect if a paragraph is a heading
   */
  private isHeading(text: string): boolean {
    // Short text (less than 100 chars)
    if (text.length > 100) return false;

    // Ends with colon or starts with number
    if (/:$/.test(text) || /^\d+\.\s/.test(text)) return true;

    // All caps
    if (text === text.toUpperCase() && text.length > 3 && /[A-Z]/.test(text)) return true;

    // Common heading patterns
    const headingPatterns = [
      /^Chapter\s+\d+/i,
      /^Section\s+\d+/i,
      /^Part\s+\d+/i,
      /^[A-Z][A-Z\s]{5,}$/  // All caps, at least 6 chars
    ];

    return headingPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Estimate heading level (1-6)
   */
  private estimateHeadingLevel(text: string): number {
    if (/^Chapter\s+\d+/i.test(text) || /^Part\s+/i.test(text)) return 1;
    if (/^Section\s+\d+/i.test(text)) return 2;
    if (/^\d+\.\d+/.test(text)) return 3;
    return 2; // Default level
  }

  /**
   * Build summary output for large Word documents using smart summarization
   */
  private buildSummaryOutput(
    relativePath: string,
    fullText: string,
    paragraphs: WordParagraph[],
    _textLength: number
  ): string {
    let output = '';

    // Show structure outline
    output += `${SECTION_SEPARATOR}\n`;
    output += `// DOCUMENT OUTLINE\n`;
    output += `${SECTION_SEPARATOR}\n`;

    const headings = paragraphs.filter(p => p.type === 'heading');
    if (headings.length > 0) {
      for (const heading of headings) {
        const indent = '  '.repeat((heading.level || 2) - 1);
        output += `// ${indent}${heading.content}\n`;
      }
    } else {
      output += `// (no clear headings detected)\n`;
    }

    // Show key content summary using smart summarization
    output += `\n`;
    output += `${SECTION_SEPARATOR}\n`;
    output += `// KEY CONTENT SUMMARY\n`;
    output += `${SECTION_SEPARATOR}\n`;

    // Use smart summarization for the entire document
    const summaryLength = Math.min(this.config.textPreviewLength * 2, fullText.length);
    const summary = summarizeText(fullText, summaryLength, 3);

    output += `// [Document Summary]\n`;
    output += `// ${summary.replace(/\n/g, '\n// ')}\n`;

    // Extract key sentences
    output += `\n`;
    output += `${SECTION_SEPARATOR}\n`;
    output += `// KEY POINTS\n`;
    output += `${SECTION_SEPARATOR}\n`;

    const keySentences = extractKeySentences(fullText, 5, 20);
    for (const item of keySentences) {
      const sentence = this.getPreview(item.text, 100);
      output += `// ${sentence}\n`;
    }

    return output;
  }

  /**
   * Build full output for small Word documents
   */
  private buildFullOutput(
    relativePath: string,
    fullText: string,
    paragraphs: WordParagraph[],
    _textLength: number
  ): string {
    let output = '';

    output += `${SECTION_SEPARATOR}\n`;
    output += `// PARAGRAPH CONTENT\n`;
    output += `${SECTION_SEPARATOR}\n`;

    output += `// Total paragraphs: ${paragraphs.length}\n\n`;

    for (const para of paragraphs) {
      const prefix = para.type === 'heading' ? '#'.repeat(para.level || 2) + ' ' : '';
      output += `// ${prefix}${this.getPreview(para.content, 500)}\n`;
    }

    return output;
  }

  /**
   * Get preview of text
   */
  private getPreview(text: string, maxLength: number): string {
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  }
}
