/**
 * Go outline extractor using gopls symbols
 */

import * as vscode from 'vscode';
import { OutlineExtractor } from './outlineExtractor';

export class GoExtractor extends OutlineExtractor {
  async extract(document: vscode.TextDocument): Promise<string> {
    const symbols = await this.getSymbols(document);

    let output = `// File: ${document.fileName} (Overview)\n`;
    output += `// Language: Go\n`;
    output += `// ═══════════════════════════════════════\n\n`;

    output += this.formatSymbols(symbols, document);

    return output;
  }
}
