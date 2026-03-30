/**
 * Abstract interface for AST-based outline extraction
 */

import * as vscode from 'vscode';

export interface SymbolInfo {
  name: string;
  kind: string;
  detail?: string;
  range: vscode.Range;
  children?: SymbolInfo[];
}

export abstract class OutlineExtractor {
  /**
   * Extract outline from document
   * Returns formatted string with type definitions, functions, etc.
   */
  abstract extract(document: vscode.TextDocument): Promise<string>;

  /**
   * Get symbols from document using VSCode's symbol provider
   */
  protected async getSymbols(document: vscode.TextDocument): Promise<vscode.SymbolInformation[]> {
    return await vscode.commands.executeCommand(
      'vscode.executeDocumentSymbolProvider',
      document.uri
    ) || [];
  }

  /**
   * Format symbols as outline
   */
  protected formatSymbols(symbols: vscode.SymbolInformation[], document: vscode.TextDocument): string {
    const lines: string[] = [];

    // Group by symbol kind
    const types = symbols.filter(s => s.kind === vscode.SymbolKind.Class || s.kind === vscode.SymbolKind.Interface || s.kind === vscode.SymbolKind.Struct);
    const functions = symbols.filter(s => s.kind === vscode.SymbolKind.Function || s.kind === vscode.SymbolKind.Method);
    const variables = symbols.filter(s => s.kind === vscode.SymbolKind.Variable || s.kind === vscode.SymbolKind.Constant);
    const imports = symbols.filter(s => s.kind === vscode.SymbolKind.Namespace || s.kind === vscode.SymbolKind.Module);

    // Add types
    if (types.length > 0) {
      lines.push(`// ═══════════════════════════════════════`);
      lines.push(`// TYPES`);
      lines.push(`// ═══════════════════════════════════════`);
      for (const type of types) {
        const line = this.getSymbolLine(type, document);
        lines.push(`// ${line}`);
      }
      lines.push('');
    }

    // Add functions
    if (functions.length > 0) {
      lines.push(`// ═══════════════════════════════════════`);
      lines.push(`// FUNCTIONS`);
      lines.push(`// ═══════════════════════════════════════`);
      for (const fn of functions) {
        const line = this.getSymbolLine(fn, document);
        lines.push(`// ${line}`);
      }
      lines.push('');
    }

    // Add imports
    if (imports.length > 0) {
      lines.push(`// ═══════════════════════════════════════`);
      lines.push(`// IMPORTS/DEPENDENCIES`);
      lines.push(`// ═══════════════════════════════════════`);
      for (const imp of imports) {
        lines.push(`// ${imp.name}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get a readable line for a symbol
   */
  protected getSymbolLine(symbol: vscode.SymbolInformation, document: vscode.TextDocument): string {
    // SymbolInformation has location.range, not range directly
    const range = symbol.location.range;
    const line = document.lineAt(range.start.line).text.trim();
    return line.substring(0, 150);
  }
}
