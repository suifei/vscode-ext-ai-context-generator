/**
 * C/C++ outline extractor using clangd symbols
 */

import * as vscode from 'vscode';
import { OutlineExtractor } from './outlineExtractor';

export class CCppExtractor extends OutlineExtractor {
  async extract(document: vscode.TextDocument): Promise<string> {
    const symbols = await this.getSymbols(document);

    let output = `// File: ${document.fileName} (Overview)\n`;
    output += `// Language: C/C++\n`;
    output += `// ═══════════════════════════════════════\n\n`;

    output += this.formatSymbols(symbols, document);

    return output;
  }
}
