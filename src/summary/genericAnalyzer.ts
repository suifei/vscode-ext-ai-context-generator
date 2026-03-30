/**
 * Generic text analyzer: line stats, pattern detection
 * Used as fallback and for large code files
 */

import { FileReadResult } from '../core/fileReader';
import { AIContextConfig, WARNING_EMOJI, SECTION_SEPARATOR } from '../config/constants';
import { getLanguageFromPath } from '../utils/languageMapper';
import { formatFileSize, getRelativePath, isCodeFile } from '../utils/fileUtils';
import { getPatterns, extractMatchingLines } from '../utils/languagePatterns';

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

    const types = extractMatchingLines(lines, patterns.type, 20, '//');
    const functions = extractMatchingLines(lines, patterns.function, 30, '//*');
    const imports = extractMatchingLines(lines, patterns.import, Infinity, '');

    let output = '';

    output += `${SECTION_SEPARATOR}\n`;
    output += `// TYPES/INTERFACES\n`;
    output += `${SECTION_SEPARATOR}\n`;
    output += types.length > 0
      ? types.map(t => `// ${t.substring(0, 100)}`).join('\n') + '\n'
      : `// (no type definitions detected)\n`;

    output += '\n';

    output += `${SECTION_SEPARATOR}\n`;
    output += `// FUNCTIONS/METHODS\n`;
    output += `${SECTION_SEPARATOR}\n`;
    output += functions.length > 0
      ? functions.map(f => `// ${f.substring(0, 120)}`).join('\n') + '\n'
      : `// (no functions detected)\n`;

    output += '\n';

    output += `${SECTION_SEPARATOR}\n`;
    output += `// IMPORTS/DEPENDENCIES\n`;
    output += `${SECTION_SEPARATOR}\n`;
    output += imports.length > 0
      ? imports.map(i => `// ${i}`).join('\n') + '\n'
      : `// (no imports detected)\n`;

    return output;
  }

  private extractTextSummary(lines: string[]): string {
    const nonEmptyLines = lines.filter(l => l.trim().length > 0);
    const avgLineLength = nonEmptyLines.reduce((sum, l) => sum + l.length, 0) / Math.max(nonEmptyLines.length, 1);

    let output = '';

    output += `${SECTION_SEPARATOR}\n`;
    output += `// TEXT ANALYSIS\n`;
    output += `${SECTION_SEPARATOR}\n`;
    output += `// Total lines: ${lines.length}\n`;
    output += `// Non-empty lines: ${nonEmptyLines.length}\n`;
    output += `// Average line length: ${Math.round(avgLineLength)} chars\n\n`;

    output += `${SECTION_SEPARATOR}\n`;
    output += `// PREVIEW (first ${Math.min(10, nonEmptyLines.length)} lines)\n`;
    output += `${SECTION_SEPARATOR}\n`;

    for (const line of nonEmptyLines.slice(0, 10)) {
      output += `// ${line.substring(0, 150)}\n`;
    }

    return output;
  }
}
