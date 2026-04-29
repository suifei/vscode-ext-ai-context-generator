/**
 * PowerPoint (.pptx) analyzer: text extraction from slides
 */

import * as fs from 'fs';
import * as path from 'path';
import { FileReadResult } from '../core/fileReader';
import { AIContextConfig, WARNING_EMOJI, SECTION_SEPARATOR } from '../config/constants';
import { getRelativePath } from '../utils/fileUtils';
import { getErrorMessage } from '../utils/errorUtils';
import { Logger } from '../core/logger';
import { cleanText, summarizeText, extractKeySentences } from '../utils/textSummarizer';

interface SlideContent {
  slideNumber: number;
  title: string;
  content: string;
}

export class PptxAnalyzer {
  constructor(
    private config: AIContextConfig,
    private workspaceRoot: string
  ) {}

  async summarize(fileResult: FileReadResult): Promise<string> {
    const relativePath = getRelativePath(this.workspaceRoot, fileResult.path);
    const ext = path.extname(fileResult.path).toLowerCase();

    // Check if file is .pptx (old .ppt format not supported)
    if (ext !== '.pptx') {
      return `// File: ${relativePath} (${WARNING_EMOJI} Unsupported PowerPoint format. Only .pptx is supported, not .ppt)\n`;
    }

    try {
      // Dynamically require pptx-parser to avoid loading browser-only dependencies
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const PPTX = require('pptx-parser');
      // Read PPTX file - extract full text first
      const dataBuffer = fs.readFileSync(fileResult.path);
      const pptxData = await PPTX.parse(dataBuffer);

      // Extract slide content
      const slides = this.extractSlides(pptxData);

      // Combine all text and clean it
      const fullText = slides.map(s => s.title + '\n' + s.content).join('\n\n');
      const cleanedText = cleanText(fullText);
      const totalSlides = slides.length;
      const totalText = cleanedText.length;

      // Check if file exceeds size threshold AND compression is enabled
      const maxFileSize = Math.max(1, Math.floor(this.config.maxFileSize || 1));
      const shouldCompress = fileResult.size > maxFileSize && this.config.enableLargeFileDegradation;

      let output = `// File: ${relativePath} (${WARNING_EMOJI} PowerPoint summary)\n`;
      output += `// Slides: ${totalSlides} | Total text: ~${totalText} chars\n`;

      if (shouldCompress) {
        output += `// Compressed: Yes (exceeds ${maxFileSize} bytes threshold)\n`;
      } else {
        output += `// Compressed: No\n`;
      }
      output += '\n';

      // Add section separator
      output += `${SECTION_SEPARATOR}\n`;
      output += `// PRESENTATION STRUCTURE\n`;
      output += `${SECTION_SEPARATOR}\n\n`;

      if (shouldCompress) {
        // Large file: use smart summarization
        output += this.buildSummaryOutput(relativePath, cleanedText, slides, totalSlides, totalText);
      } else {
        // Small file: show all content
        output += this.buildFullOutput(relativePath, cleanedText, slides, totalSlides, totalText);
      }

      return output;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      Logger.warn(`Error parsing PowerPoint file ${fileResult.path}: ${message}`);
      return `// File: ${relativePath} (${WARNING_EMOJI} PowerPoint parse error)\n// Error: ${message}\n`;
    }
  }

  /**
   * Extract slide content from PPTX data
   */
  private extractSlides(pptxData: unknown): SlideContent[] {
    const slides: SlideContent[] = [];

    try {
      // pptx-parser returns an object with slides array
      const data = pptxData as { slides?: unknown[] } | undefined;
      const slidesData = data?.slides || [];

      for (let i = 0; i < slidesData.length; i++) {
        const slideData = slidesData[i];

        // Extract title (usually the first text element or main title)
        let title = '';
        let content = '';

        // Extract all text from the slide
        if (slideData) {
          // Get all text elements
          const texts: string[] = [];

          // Try different properties that might contain text
          if (Array.isArray(slideData)) {
            for (const item of slideData) {
              if (item && typeof item === 'object') {
                const itemObj = item as Record<string, unknown>;
                if (typeof itemObj.text === 'string') texts.push(itemObj.text);
                if (typeof itemObj.content === 'string') texts.push(itemObj.content);
                if (typeof itemObj.value === 'string') texts.push(itemObj.value);
              }
            }
          } else if (typeof slideData === 'object' && slideData !== null) {
            // Single object slide
            const slideObj = slideData as Record<string, unknown>;
            if (typeof slideObj.title === 'string') title = slideObj.title;
            if (typeof slideObj.text === 'string') content = slideObj.text;
            if (typeof slideObj.content === 'string') content = slideObj.content;

            // Try to get all text from shapes or elements
            const elements = slideObj.elements as unknown[] | undefined;
            if (elements && Array.isArray(elements)) {
              for (const elem of elements) {
                if (elem && typeof elem === 'object') {
                  const elemObj = elem as Record<string, unknown>;
                  if (typeof elemObj.text === 'string') texts.push(elemObj.text);
                  if (typeof elemObj.content === 'string') texts.push(elemObj.content);
                }
              }
            }
            const shapes = slideObj.shapes as unknown[] | undefined;
            if (shapes && Array.isArray(shapes)) {
              for (const shape of shapes) {
                if (shape && typeof shape === 'object') {
                  const shapeObj = shape as Record<string, unknown>;
                  if (typeof shapeObj.text === 'string') texts.push(shapeObj.text);
                  if (typeof shapeObj.content === 'string') texts.push(shapeObj.content);
                }
              }
            }
          }

          // Combine all texts
          if (texts.length > 0) {
            if (!content) {
              content = texts.join(' ');
            }
            if (!title && texts.length > 0) {
              title = texts[0]; // First text as title
            }
          }
        }

        // Clean up extracted text
        title = cleanText(title);
        content = cleanText(content);

        slides.push({
          slideNumber: i + 1,
          title: title || `Slide ${i + 1}`,
          content: content || (title ? '' : '(no text content)')
        });
      }
    } catch (error) {
      Logger.warn(`Error extracting slide content: ${getErrorMessage(error)}`);
    }

    return slides;
  }

  /**
   * Build summary output for large PowerPoint files using smart summarization
   */
  private buildSummaryOutput(
    relativePath: string,
    fullText: string,
    slides: SlideContent[],
    _totalSlides: number,
    _totalText: number
  ): string {
    let output = '';

    // Show slide titles outline
    output += `${SECTION_SEPARATOR}\n`;
    output += `// SLIDE TITLES\n`;
    output += `${SECTION_SEPARATOR}\n`;

    for (const slide of slides) {
      output += `// [Slide ${slide.slideNumber}] ${slide.title}\n`;
    }

    // Show key content summary using smart summarization
    output += `\n`;
    output += `${SECTION_SEPARATOR}\n`;
    output += `// KEY CONTENT SUMMARY\n`;
    output += `${SECTION_SEPARATOR}\n`;

    // Use smart summarization for the entire presentation
    const previewLength = Math.max(1, Math.floor(this.config.textPreviewLength || 1));
    const summaryLength = Math.min(previewLength * 2, fullText.length);
    const summary = summarizeText(fullText, summaryLength, 3);

    output += `// [Presentation Summary]\n`;
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
   * Build full output for small PowerPoint files
   */
  private buildFullOutput(
    relativePath: string,
    fullText: string,
    slides: SlideContent[],
    _totalSlides: number,
    _totalText: number
  ): string {
    let output = '';

    output += `${SECTION_SEPARATOR}\n`;
    output += `// SLIDE CONTENT\n`;
    output += `${SECTION_SEPARATOR}\n`;

    for (const slide of slides) {
      output += `\n// [Slide ${slide.slideNumber}] ${slide.title}\n`;
      const content = this.getPreview(slide.content, 500);
      if (content) {
        output += `// ${content.replace(/\n/g, '\n// ')}\n`;
      }
    }

    return output;
  }

  /**
   * Get preview of text
   */
  private getPreview(text: string, maxLength: number): string {
    if (!text) return '';

    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  }
}
