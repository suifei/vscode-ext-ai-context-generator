/**
 * Generic text analyzer: line stats, pattern detection
 * Used as fallback and for large code files
 */

import * as path from 'path';
import { FileReadResult } from '../core/fileReader';
import { AIContextConfig, WARNING_EMOJI } from '../config/constants';
import { getLanguageFromPath } from '../utils/languageMapper';
import { formatFileSize, getRelativePath, isCodeFile } from '../utils/fileUtils';
import { getPatterns } from '../utils/languagePatterns';

export class GenericAnalyzer {
  private config: AIContextConfig;
  private workspaceRoot: string;

  constructor(config: AIContextConfig, workspaceRoot: string) {
    this.config = config;
    this.workspaceRoot = workspaceRoot;
  }

  summarize(fileResult: FileReadResult): string {
    const relativePath = getRelativePath(this.workspaceRoot, fileResult.path);
    const lines = fileResult.content.split('\n');
    const language = fileResult.language || getLanguageFromPath(fileResult.path) || 'text';

    let output = `// File: ${relativePath} (${WARNING_EMOJI} Overview — ${formatFileSize(fileResult.size)}, structure outline)\n`;
    output += `// Language: ${language}\n`;
    output += `// Total lines: ${lines.length}\n\n`;

    if (isCodeFile(fileResult.path)) {
      output += this.extractCodeStructure(fileResult.content, language);
    } else {
      output += this.extractTextSummary(lines);
    }

    return output;
  }

  private extractCodeStructure(content: string, language: string): string {
    const lines = content.split('\n');
    const patterns = getPatterns(language);

    const types = this.extractPatterns(lines, patterns.type, 20, '//');
    const functions = this.extractPatterns(lines, patterns.function, 30, '//*');
    const imports = this.extractPatterns(lines, patterns.import, Infinity, '');

    let output = '';

    output += `// ═══════════════════════════════════════\n`;
    output += `// TYPES/INTERFACES\n`;
    output += `// ═══════════════════════════════════════\n`;
    output += types.length > 0
      ? types.map(t => `// ${t.substring(0, 100)}`).join('\n') + '\n'
      : `// (no type definitions detected)\n`;

    output += '\n';

    output += `// ═══════════════════════════════════════\n`;
    output += `// FUNCTIONS/METHODS\n`;
    output += `// ═══════════════════════════════════════\n`;
    output += functions.length > 0
      ? functions.map(f => `// ${f.substring(0, 120)}`).join('\n') + '\n'
      : `// (no functions detected)\n`;

    output += '\n';

    output += `// ═══════════════════════════════════════\n`;
    output += `// IMPORTS/DEPENDENCIES\n`;
    output += `// ═══════════════════════════════════════\n`;
    output += imports.length > 0
      ? imports.map(i => `// ${i}`).join('\n') + '\n'
      : `// (no imports detected)\n`;

    return output;
  }

  private extractPatterns(
    lines: string[],
    patterns: RegExp[],
    limit: number,
    skipPrefix: string
  ): string[] {
    const results: string[] = [];

    for (const line of lines) {
      if (results.length >= limit) break;

      const trimmed = line.trim();
      if (skipPrefix && trimmed.startsWith(skipPrefix)) continue;

      for (const pattern of patterns) {
        if (pattern.test(trimmed)) {
          results.push(trimmed);
          break;
        }
      }
    }

    return results;
  }

  private extractTextSummary(lines: string[]): string {
    const nonEmptyLines = lines.filter(l => l.trim().length > 0);
    const avgLineLength = nonEmptyLines.reduce((sum, l) => sum + l.length, 0) / Math.max(nonEmptyLines.length, 1);

    let output = '';

    output += `// ═══════════════════════════════════════\n`;
    output += `// TEXT ANALYSIS\n`;
    output += `// ═══════════════════════════════════════\n`;
    output += `// Total lines: ${lines.length}\n`;
    output += `// Non-empty lines: ${nonEmptyLines.length}\n`;
    output += `// Average line length: ${Math.round(avgLineLength)} chars\n\n`;

    output += `// ═══════════════════════════════════════\n`;
    output += `// PREVIEW (first ${Math.min(10, nonEmptyLines.length)} lines)\n`;
    output += `// ═══════════════════════════════════════\n`;

    for (const line of nonEmptyLines.slice(0, 10)) {
      output += `// ${line.substring(0, 150)}\n`;
    }

    return output;
  }
}
