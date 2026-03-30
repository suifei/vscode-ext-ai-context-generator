/**
 * Markdown/doc analyzer: heading outline, keyword extraction
 */

import * as path from 'path';
import { FileReadResult } from '../core/fileReader';
import { AIContextConfig, WARNING_EMOJI } from '../config/constants';
import { getRelativePath } from '../utils/fileUtils';

export class DocAnalyzer {
  constructor(
    private config: AIContextConfig,
    private workspaceRoot: string
  ) {}

  summarize(fileResult: FileReadResult): string {
    const relativePath = getRelativePath(this.workspaceRoot, fileResult.path);
    const lines = fileResult.content.split('\n');

    const headings = this.extractHeadings(lines);
    const codeBlocks = this.extractCodeBlocks(lines);
    const keywords = this.extractKeywords(fileResult.content);
    const firstParagraph = this.getFirstParagraph(lines);

    return this.buildOutput(
      relativePath,
      lines,
      headings,
      codeBlocks,
      keywords,
      firstParagraph
    );
  }

  private extractHeadings(lines: string[]): Array<{ level: number; text: string }> {
    const headings: Array<{ level: number; text: string }> = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const match = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        headings.push({ level: match[1].length, text: match[2] });
      }
      if (headings.length >= 50) break;
    }

    return headings;
  }

  private extractCodeBlocks(lines: string[]): Array<{ lang: string; lines: number }> {
    const blocks: Array<{ lang: string; lines: number }> = [];
    let inBlock = false;
    let blockLang = '';
    let blockStart = 0;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('```')) {
        if (!inBlock) {
          inBlock = true;
          blockLang = trimmed.substring(3).trim() || 'text';
          blockStart = i;
        } else {
          blocks.push({ lang: blockLang, lines: i - blockStart - 1 });
          inBlock = false;
        }
      }
    }

    return blocks;
  }

  private extractKeywords(content: string): string[] {
    const withoutCode = content.replace(/```[\s\S]*?```/g, '');
    const words = (withoutCode.match(/\b[a-zA-Z]{3,}\b/g) || []).map(w => w.toLowerCase());

    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
      'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'this', 'that',
    ]);

    const frequency = new Map<string, number>();
    for (const word of words) {
      if (!stopWords.has(word)) {
        frequency.set(word, (frequency.get(word) || 0) + 1);
      }
    }

    return Array.from(frequency.entries())
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private getFirstParagraph(lines: string[]): string | null {
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('```') && !trimmed.startsWith('>')) {
        const text = trimmed.substring(0, 200);
        return text.length === 200 ? text + '...' : text;
      }
    }
    return null;
  }

  private buildOutput(
    relativePath: string,
    lines: string[],
    headings: Array<{ level: number; text: string }>,
    codeBlocks: Array<{ lang: string; lines: number }>,
    keywords: string[],
    firstParagraph: string | null
  ): string {
    let output = `// File: ${relativePath} (${WARNING_EMOJI} Document outline)\n\n`;
    output += `// ═══════════════════════════════════════\n`;
    output += `// DOCUMENT STRUCTURE\n`;
    output += `// ═══════════════════════════════════════\n`;
    output += `// Lines: ${lines.length} | Headings: ${headings.length}\n\n`;

    if (headings.length > 0) {
      for (const { level, text } of headings) {
        const indent = '  '.repeat(level - 1);
        output += `${indent}// ${'#'.repeat(level)} ${text}\n`;
      }
    } else {
      output += `// (no headings detected)\n`;
    }

    output += '\n';

    if (codeBlocks.length > 0) {
      output += `// ═══════════════════════════════════════\n`;
      output += `// CODE BLOCKS (${codeBlocks.length})\n`;
      output += `// ═══════════════════════════════════════\n`;
      for (const block of codeBlocks) {
        output += `// \`\`\`${block.lang} (${block.lines} lines)\n`;
      }
      output += '\n';
    }

    if (keywords.length > 0) {
      output += `// ═══════════════════════════════════════\n`;
      output += `// KEY TERMS\n`;
      output += `// ═══════════════════════════════════════\n`;
      output += `// ${keywords.join(', ')}\n`;
    }

    if (firstParagraph) {
      output += '\n';
      output += `// ═══════════════════════════════════════\n`;
      output += `// OPENING PARAGRAPH\n`;
      output += `// ═══════════════════════════════════════\n`;
      output += `// ${firstParagraph}\n`;
    }

    return output;
  }
}
