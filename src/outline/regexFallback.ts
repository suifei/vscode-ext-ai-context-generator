/**
 * Regex-based extraction when LSP is unavailable
 * Used as fallback for all languages
 */

import * as vscode from 'vscode';
import { OutlineExtractor } from './outlineExtractor';
import { getPatterns } from '../utils/languagePatterns';
import {
  OUTLINE_SEPARATOR,
  SECTION_TITLES,
  truncateText,
} from './formatConstants';
import type { OutlineOptions } from './registry';

export class RegexFallback extends OutlineExtractor {
  /**
   * Extract outline using regex patterns
   */
  async extract(document: vscode.TextDocument, options?: OutlineOptions): Promise<string> {
    this.options = this.mergeOptions(options);

    const content = document.getText();
    const lines = content.split('\n');

    // Detect patterns based on language
    const patterns = getPatterns(document.languageId);

    const types: string[] = [];
    const functions: string[] = [];
    const imports: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) {
        continue;
      }

      // Check for import patterns first (before skipping # lines)
      for (const pattern of patterns.import) {
        if (pattern.test(trimmed)) {
          imports.push(truncateText(trimmed, 100));
          break;
        }
      }

      // Skip comments after import check
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
        continue;
      }

      // Skip preprocessor directives for C/C++ (except includes which were already caught)
      if (trimmed.startsWith('#') && !trimmed.startsWith('#include')) {
        continue;
      }

      // Check for type patterns
      for (const pattern of patterns.type) {
        if (pattern.test(trimmed)) {
          types.push(this.formatLineWithDoc(trimmed, document, i, 100));
          break;
        }
      }

      // Check for function patterns
      for (const pattern of patterns.function) {
        if (pattern.test(trimmed)) {
          functions.push(this.formatLineWithDoc(trimmed, document, i, 120));
          break;
        }
      }
    }

    // Filter private members if needed
    let filteredTypes = types;
    let filteredFunctions = functions;

    if (!this.options.includePrivate) {
      filteredTypes = types.filter(t => !this.isPrivateLine(t));
      filteredFunctions = functions.filter(f => !this.isPrivateLine(f));
    }

    // Apply maxItems limit
    const typesToShow = filteredTypes.slice(0, this.options.maxItems);
    const functionsToShow = filteredFunctions.slice(0, this.options.maxItems);
    const importsToShow = imports.slice(0, this.options.maxItems);

    const output: string[] = [];

    // Output types
    if (typesToShow.length > 0) {
      output.push(OUTLINE_SEPARATOR);
      output.push(`// ${SECTION_TITLES.TYPES}`);
      output.push(OUTLINE_SEPARATOR);
      for (const type of typesToShow) {
        output.push(`// ${type}`);
      }
      if (filteredTypes.length > this.options.maxItems) {
        output.push(`// ... (${filteredTypes.length - this.options.maxItems} more types)`);
      }
      output.push('');
    }

    // Output functions
    if (functionsToShow.length > 0) {
      output.push(OUTLINE_SEPARATOR);
      output.push(`// ${SECTION_TITLES.FUNCTIONS}`);
      output.push(OUTLINE_SEPARATOR);
      for (const fn of functionsToShow) {
        output.push(`// ${fn}`);
      }
      if (filteredFunctions.length > this.options.maxItems) {
        output.push(`// ... (${filteredFunctions.length - this.options.maxItems} more functions)`);
      }
      output.push('');
    }

    // Output imports
    if (importsToShow.length > 0) {
      output.push(OUTLINE_SEPARATOR);
      output.push(`// ${SECTION_TITLES.IMPORTS}`);
      output.push(OUTLINE_SEPARATOR);
      for (const imp of importsToShow) {
        output.push(`// ${imp}`);
      }
      if (imports.length > this.options.maxItems) {
        output.push(`// ... (${imports.length - this.options.maxItems} more imports)`);
      }
    }

    return output.join('\n');
  }

  /**
   * Check if a line represents a private member
   */
  private isPrivateLine(line: string): boolean {
    const trimmed = line.trim();

    // Check for explicit private keyword
    if (trimmed.includes('private ')) return true;

    // Check for # private fields (TypeScript/JavaScript private class fields)
    if (trimmed.startsWith('#')) return true;

    // Check for _ prefix (convention for private/protected)
    // Look for function/method definitions with _ prefix
    // Match: "def _method", "function _method", "_method(", etc.
    const privatePattern = /^\s*(def|function|async\s+function|let|const|var)\s+_/;
    if (privatePattern.test(trimmed)) return true;

    return false;
  }

  private formatLineWithDoc(line: string, document: vscode.TextDocument, lineNumber: number, maxLength: number): string {
    const signature = truncateText(line, maxLength);
    const lineInfo = this.options.detail === 'detailed' ? ` [L${lineNumber + 1}]` : '';
    if (!this.options.extractComments) {
      return `${signature}${lineInfo}`;
    }

    const doc = this.extractLeadingComment(document, lineNumber);
    return doc ? `${signature}${lineInfo} [doc: ${doc}]` : `${signature}${lineInfo}`;
  }
}
