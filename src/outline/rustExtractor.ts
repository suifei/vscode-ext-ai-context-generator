/**
 * Rust outline extractor using rust-analyzer symbols
 */

import * as vscode from 'vscode';
import { OutlineExtractor } from './outlineExtractor';

export class RustExtractor extends OutlineExtractor {
  async extract(document: vscode.TextDocument): Promise<string> {
    const symbols = await this.getSymbols(document);

    let output = `// File: ${document.fileName} (Overview)\n`;
    output += `// Language: Rust\n`;
    output += `// ═══════════════════════════════════════\n\n`;

    output += this.formatSymbols(symbols, document);

    return output;
  }
}
