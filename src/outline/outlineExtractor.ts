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
import type { OutlineOptions } from './registry';

export class OutlineExtractor {
  protected options: Required<OutlineOptions>;

  public static readonly DEFAULT_OPTIONS: Required<OutlineOptions> = {
    detail: 'standard',
    includePrivate: false,
    extractComments: true,
    maxItems: 100,
  };

  constructor() {
    this.options = { ...OutlineExtractor.DEFAULT_OPTIONS };
  }

  /**
   * Merge user options with defaults
   */
  protected mergeOptions(options?: OutlineOptions): Required<OutlineOptions> {
    if (!options) return this.options;

    return {
      detail: options.detail || OutlineExtractor.DEFAULT_OPTIONS.detail,
      includePrivate: options.includePrivate ?? OutlineExtractor.DEFAULT_OPTIONS.includePrivate,
      extractComments: options.extractComments ?? OutlineExtractor.DEFAULT_OPTIONS.extractComments,
      maxItems: options.maxItems || OutlineExtractor.DEFAULT_OPTIONS.maxItems,
    };
  }

  /**
   * Extract outline from document
   * Returns formatted string with type definitions, functions, etc.
   */
  async extract(document: vscode.TextDocument, options?: OutlineOptions): Promise<string> {
    this.options = this.mergeOptions(options);

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
    let types = symbols.filter(s => this.isTypeSymbol(s.kind));
    let functions = symbols.filter(s => this.isFunctionSymbol(s.kind));
    let imports = symbols.filter(s => this.isNamespaceSymbol(s.kind));

    // Filter private members if needed
    if (!this.options.includePrivate) {
      types = types.filter(s => !this.isPrivateSymbol(s));
      functions = functions.filter(s => !this.isPrivateSymbol(s));
    }

    // Apply maxItems limit
    types = types.slice(0, this.options.maxItems);
    functions = functions.slice(0, this.options.maxItems);
    imports = imports.slice(0, this.options.maxItems);

    // Add types section
    if (types.length > 0) {
      lines.push(formatSectionHeader(SECTION_TITLES.TYPES));
      for (const type of types) {
        const line = this.getSymbolLine(type, document);
        lines.push(`// ${line}`);
      }
      if (types.length >= this.options.maxItems) {
        lines.push(`// ... (output limited to ${this.options.maxItems} items)`);
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
      if (functions.length >= this.options.maxItems) {
        lines.push(`// ... (output limited to ${this.options.maxItems} items)`);
      }
      lines.push('');
    }

    // Add imports section
    if (imports.length > 0) {
      lines.push(formatSectionHeader(SECTION_TITLES.IMPORTS));
      for (const imp of imports) {
        lines.push(`// ${imp.name}`);
      }
      if (imports.length >= this.options.maxItems) {
        lines.push(`// ... (output limited to ${this.options.maxItems} items)`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Check if a symbol is private
   */
  protected isPrivateSymbol(symbol: vscode.SymbolInformation): boolean {
    return symbol.name.startsWith('_') || symbol.name.startsWith('#');
  }

  /**
   * Get a readable line for a symbol
   */
  protected getSymbolLine(symbol: vscode.SymbolInformation, document: vscode.TextDocument): string {
    const range = symbol.location.range;
    const line = document.lineAt(range.start.line).text.trim();

    if (this.options.detail === 'basic') {
      return symbol.name;
    }

    const signature = truncateText(extractCodeSignature(line), 150);
    if (this.options.detail === 'detailed') {
      return `${symbol.name} → ${signature}`;
    }
    return signature || symbol.name;
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
