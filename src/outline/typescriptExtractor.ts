/**
 * TypeScript outline extractor using VSCode TS Language Service
 */

import * as vscode from 'vscode';
import { OutlineExtractor } from './outlineExtractor';

export class TypescriptExtractor extends OutlineExtractor {
  async extract(document: vscode.TextDocument): Promise<string> {
    const symbols = await this.getSymbols(document);

    let output = `// File: ${document.fileName} (Overview)\n`;
    output += `// Language: TypeScript/JavaScript\n`;
    output += `// ═══════════════════════════════════════\n\n`;

    output += this.formatSymbols(symbols, document);

    return output;
  }
}
