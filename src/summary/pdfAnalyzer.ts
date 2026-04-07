/**
 * PDF analyzer: text extraction with page numbers, content summarization
 */

import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');
import { FileReadResult } from '../core/fileReader';
import { AIContextConfig, WARNING_EMOJI, SECTION_SEPARATOR } from '../config/constants';
import { getRelativePath } from '../utils/fileUtils';
import { getErrorMessage } from '../utils/errorUtils';
import { Logger } from '../core/logger';
import { cleanText, summarizeText, extractKeySentences } from '../utils/textSummarizer';

interface PdfData {
  numpages: number;
  text: string;
  numPages?: number;
}

interface PdfPage {
  pageNumber: number;
  content: string;
}

export class PdfAnalyzer {
  constructor(
    private config: AIContextConfig,
    private workspaceRoot: string
  ) {}

  async summarize(fileResult: FileReadResult): Promise<string> {
    const relativePath = getRelativePath(this.workspaceRoot, fileResult.path);
    const ext = path.extname(fileResult.path).toLowerCase();

    // Check if file is .pdf
    if (ext !== '.pdf') {
      return `// File: ${relativePath} (${WARNING_EMOJI} Unsupported format for PDF analyzer)\n`;
    }

    try {
      // Read PDF file and extract full text first
      const dataBuffer = fs.readFileSync(fileResult.path);
      const pdfData = await this.parsePdf(dataBuffer);

      // Clean the extracted text
      const cleanedText = cleanText(pdfData.text);
      const textLength = cleanedText.length;
      const totalPages = pdfData.numpages;

      // Check if file exceeds size threshold AND compression is enabled
      const shouldCompress = fileResult.size > this.config.maxFileSize && this.config.enableLargeFileDegradation;

      let output = `// File: ${relativePath} (${WARNING_EMOJI} PDF structure)\n`;
      output += `// Pages: ${totalPages} | Total text: ~${textLength} chars\n`;

      if (shouldCompress) {
        output += `// Compressed: Yes (exceeds ${this.config.textPreviewLength} chars threshold)\n`;
      } else {
        output += `// Compressed: No\n`;
      }
      output += '\n';

      // Add section separator
      output += `${SECTION_SEPARATOR}\n`;
      output += `// PDF STRUCTURE\n`;
      output += `${SECTION_SEPARATOR}\n\n`;

      // Split text into pages (heuristic since pdf-parse doesn't preserve page boundaries)
      const pages = this.extractPageContent(cleanedText, totalPages);

      if (shouldCompress) {
        // Large file with compression enabled: use smart summarization
        output += this.buildSummaryOutput(relativePath, cleanedText, pages, totalPages, textLength);
      } else {
        // Small file or compression disabled: show all content
        output += this.buildFullOutput(relativePath, cleanedText, pages, totalPages, textLength);
      }

      return output;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      Logger.warn(`Error parsing PDF ${fileResult.path}: ${message}`);
      return `// File: ${relativePath} (${WARNING_EMOJI} PDF parse error)\n// Error: ${message}\n`;
    }
  }

  /**
   * Parse PDF with error handling
   */
  private async parsePdf(buffer: Buffer): Promise<PdfData> {
    return new Promise((resolve, reject) => {
      pdfParse(buffer, (err: Error | null, data: PdfData) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  /**
   * Extract page content from cleaned text
   * Estimate page boundaries by dividing text equally
   */
  private extractPageContent(text: string, totalPages: number): PdfPage[] {
    const charsPerPage = Math.ceil(text.length / totalPages);
    const pages: PdfPage[] = [];

    for (let i = 0; i < totalPages; i++) {
      const start = i * charsPerPage;
      const end = Math.min((i + 1) * charsPerPage, text.length);
      const content = text.substring(start, end).trim();

      if (content) {
        pages.push({
          pageNumber: i + 1,
          content
        });
      }
    }

    return pages;
  }

  /**
   * Build summary output for large PDFs using smart summarization
   */
  private buildSummaryOutput(
    relativePath: string,
    fullText: string,
    pages: PdfPage[],
    totalPages: number,
    _textLength: number
  ): string {
    let output = '';

    // Show page outline
    output += `${SECTION_SEPARATOR}\n`;
    output += `// PAGE OUTLINE\n`;
    output += `${SECTION_SEPARATOR}\n`;

    for (const page of pages) {
      const preview = this.getPreview(page.content, 50);
      output += `// [Page ${page.pageNumber}] ${preview}\n`;
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

    // Extract key sentences from different sections
    output += `\n`;
    output += `${SECTION_SEPARATOR}\n`;
    output += `// KEY POINTS\n`;
    output += `${SECTION_SEPARATOR}\n`;

    const keySentences = extractKeySentences(fullText, 5, 20);
    for (const item of keySentences) {
      // Estimate which page this sentence is on
      const estimatedPage = Math.min(
        Math.floor((item.position / keySentences.length) * totalPages) + 1,
        totalPages
      );
      const sentence = this.getPreview(item.text, 100);
      output += `// [~Page ${estimatedPage}] ${sentence}\n`;
    }

    return output;
  }

  /**
   * Build full output for small PDFs
   */
  private buildFullOutput(
    relativePath: string,
    fullText: string,
    pages: PdfPage[],
    _totalPages: number,
    _textLength: number
  ): string {
    let output = '';

    output += `${SECTION_SEPARATOR}\n`;
    output += `// PAGE CONTENT\n`;
    output += `${SECTION_SEPARATOR}\n`;

    for (const page of pages) {
      output += `\n// [Page ${page.pageNumber}]\n`;
      const content = this.getPreview(page.content, 500);
      output += `// ${content.replace(/\n/g, '\n// ')}\n`;
    }

    return output;
  }

  /**
   * Get preview of text, cleaned and truncated
   */
  private getPreview(text: string, maxLength: number): string {
    // Clean up whitespace
    let cleaned = text.replace(/\s+/g, ' ').trim();

    // Remove common PDF artifacts (control characters)
    // eslint-disable-next-line no-control-regex
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    if (cleaned.length > maxLength) {
      cleaned = cleaned.substring(0, maxLength) + '...';
    }

    return cleaned || '(empty)';
  }
}
