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

export class RegexFallback extends OutlineExtractor {
  async extract(document: vscode.TextDocument): Promise<string> {
    const content = document.getText();
    const lines = content.split('\n');

    // Detect patterns based on language
    const patterns = getPatterns(document.languageId);

    const types: string[] = [];
    const functions: string[] = [];
    const imports: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*')) {
        continue;
      }

      // Check for type patterns
      for (const pattern of patterns.type) {
        if (pattern.test(trimmed)) {
          types.push(truncateText(trimmed, 100));
          break;
        }
      }

      // Check for function patterns
      for (const pattern of patterns.function) {
        if (pattern.test(trimmed)) {
          functions.push(truncateText(trimmed, 120));
          break;
        }
      }

      // Check for import patterns
      for (const pattern of patterns.import) {
        if (pattern.test(trimmed)) {
          imports.push(truncateText(trimmed, 100));
          break;
        }
      }
    }

    const output: string[] = [];

    // Output types
    if (types.length > 0) {
      output.push(OUTLINE_SEPARATOR);
      output.push(`// ${SECTION_TITLES.TYPES}`);
      output.push(OUTLINE_SEPARATOR);
      for (const type of types.slice(0, 20)) {
        output.push(`// ${type}`);
      }
      if (types.length > 20) {
        output.push(`// ... (${types.length - 20} more types)`);
      }
      output.push('');
    }

    // Output functions
    if (functions.length > 0) {
      output.push(OUTLINE_SEPARATOR);
      output.push(`// ${SECTION_TITLES.FUNCTIONS}`);
      output.push(OUTLINE_SEPARATOR);
      for (const fn of functions.slice(0, 30)) {
        output.push(`// ${fn}`);
      }
      if (functions.length > 30) {
        output.push(`// ... (${functions.length - 30} more functions)`);
      }
      output.push('');
    }

    // Output imports
    if (imports.length > 0) {
      output.push(OUTLINE_SEPARATOR);
      output.push(`// ${SECTION_TITLES.IMPORTS}`);
      output.push(OUTLINE_SEPARATOR);
      for (const imp of imports.slice(0, 15)) {
        output.push(`// ${imp}`);
      }
      if (imports.length > 15) {
        output.push(`// ... (${imports.length - 15} more imports)`);
      }
    }

    return output.join('\n');
  }
}
