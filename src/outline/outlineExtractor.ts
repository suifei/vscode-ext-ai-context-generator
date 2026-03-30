/**
 * Outline extraction using VSCode's symbol provider
 * Refactored to use shared formatting constants
 */

import * as vscode from 'vscode';
import { Logger } from '../core/logger';
import {
  OUTLINE_SEPARATOR,
  SECTION_TITLES,
  formatSectionHeader,
  truncateText,
  extractCodeSignature,
} from './formatConstants';

export class OutlineExtractor {
  /**
   * Extract outline from document
   * Returns formatted string with type definitions, functions, etc.
   */
  async extract(document: vscode.TextDocument): Promise<string> {
    try {
      const symbols = await this.getSymbols(document);
      return this.formatSymbols(symbols, document);
    } catch (error) {
      Logger.warn(`Outline extraction failed for ${document.uri.fsPath}:`, error);
      return '';
    }
  }

  /**
   * Get symbols from document using VSCode's symbol provider
   */
  protected async getSymbols(document: vscode.TextDocument): Promise<vscode.SymbolInformation[]> {
    try {
      const result = await vscode.commands.executeCommand(
        'vscode.executeDocumentSymbolProvider',
        document.uri
      );
      return (result as vscode.SymbolInformation[]) || [];
    } catch (error) {
      Logger.debug(`LSP symbol extraction failed for ${document.uri.fsPath}:`, error);
      return [];
    }
  }

  /**
   * Format symbols as outline
   */
  protected formatSymbols(symbols: vscode.SymbolInformation[], document: vscode.TextDocument): string {
    const lines: string[] = [];

    // Group by symbol kind
    const types = symbols.filter(s => this.isTypeSymbol(s.kind));
    const functions = symbols.filter(s => this.isFunctionSymbol(s.kind));
    const imports = symbols.filter(s => this.isNamespaceSymbol(s.kind));

    // Add types section
    if (types.length > 0) {
      lines.push(formatSectionHeader(SECTION_TITLES.TYPES));
      for (const type of types) {
        const line = this.getSymbolLine(type, document);
        lines.push(`// ${line}`);
      }
      lines.push('');
    }

    // Add functions section
    if (functions.length > 0) {
      lines.push(formatSectionHeader(SECTION_TITLES.FUNCTIONS));
      for (const fn of functions) {
        const line = this.getSymbolLine(fn, document);
        lines.push(`// ${line}`);
      }
      lines.push('');
    }

    // Add imports section
    if (imports.length > 0) {
      lines.push(formatSectionHeader(SECTION_TITLES.IMPORTS));
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
    const range = symbol.location.range;
    const line = document.lineAt(range.start.line).text.trim();
    return truncateText(extractCodeSignature(line), 150);
  }

  /**
   * Check if symbol kind is a type
   */
  protected isTypeSymbol(kind: vscode.SymbolKind): boolean {
    return kind === vscode.SymbolKind.Class ||
           kind === vscode.SymbolKind.Interface ||
           kind === vscode.SymbolKind.Struct ||
           kind === vscode.SymbolKind.Enum;
  }

  /**
   * Check if symbol kind is a function
   */
  protected isFunctionSymbol(kind: vscode.SymbolKind): boolean {
    return kind === vscode.SymbolKind.Function ||
           kind === vscode.SymbolKind.Method ||
           kind === vscode.SymbolKind.Constructor;
  }

  /**
   * Check if symbol kind is a namespace
   */
  protected isNamespaceSymbol(kind: vscode.SymbolKind): boolean {
    return kind === vscode.SymbolKind.Namespace ||
           kind === vscode.SymbolKind.Module;
  }
}
