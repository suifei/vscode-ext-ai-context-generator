/**
 * Enhanced AST-based outline extractor using VSCode's DocumentSymbol API
 * Provides hierarchical symbol information with parent-child relationships
 */

import * as vscode from 'vscode';
import { OutlineExtractor } from './outlineExtractor';
import { Logger } from '../core/logger';
import {
  OUTLINE_SEPARATOR,
  SECTION_TITLES,
  truncateText,
  extractCodeSignature,
} from './formatConstants';

interface SymbolNode {
  name: string;
  kind: vscode.SymbolKind;
  detail: string;
  range: vscode.Range;
  children: SymbolNode[];
  signature?: string;
}

export class ASTExtractor extends OutlineExtractor {
  /**
   * Extract hierarchical symbols using DocumentSymbol API
   */
  protected async getDocumentSymbols(document: vscode.TextDocument): Promise<vscode.DocumentSymbol[] | undefined> {
    try {
      const result = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        document.uri
      );
      return result;
    } catch (error) {
      Logger.debug(`DocumentSymbol extraction failed for ${document.uri.fsPath}:`, error);
      return undefined;
    }
  }

  /**
   * Extract outline with enhanced hierarchical information
   */
  async extract(document: vscode.TextDocument): Promise<string> {
    try {
      const symbols = await this.getDocumentSymbols(document);

      if (!symbols || symbols.length === 0) {
        // Fallback to base class method
        return super.extract(document);
      }

      return this.formatDocumentSymbols(symbols, document);
    } catch (error) {
      Logger.warn(`AST extraction failed for ${document.uri.fsPath}:`, error);
      return super.extract(document);
    }
  }

  /**
   * Format hierarchical DocumentSymbols into outline
   */
  private formatDocumentSymbols(symbols: vscode.DocumentSymbol[], document: vscode.TextDocument): string {
    const lines: string[] = [];
    const root = this.buildSymbolTree(symbols);

    // Group by type at root level
    const types = root.children.filter(s => this.isTypeSymbol(s.kind));
    const functions = root.children.filter(s => this.isFunctionSymbol(s.kind));
    const namespaces = root.children.filter(s => this.isNamespaceSymbol(s.kind));

    if (types.length > 0) {
      lines.push(this.formatTypeSection(types, document));
    }

    if (functions.length > 0) {
      lines.push(this.formatFunctionSection(functions, document));
    }

    if (namespaces.length > 0) {
      lines.push(this.formatImportSection(namespaces));
    }

    return lines.join('\n\n');
  }

  /**
   * Build hierarchical symbol tree
   */
  private buildSymbolTree(symbols: vscode.DocumentSymbol[]): SymbolNode {
    return {
      name: '(root)',
      kind: vscode.SymbolKind.Module,
      detail: '',
      range: new vscode.Range(0, 0, 0, 0),
      children: symbols.map(s => this.documentSymbolToNode(s)),
    };
  }

  /**
   * Convert DocumentSymbol to SymbolNode
   */
  private documentSymbolToNode(symbol: vscode.DocumentSymbol): SymbolNode {
    return {
      name: symbol.name,
      kind: symbol.kind,
      detail: symbol.detail,
      range: symbol.range,
      signature: this.extractSignature(symbol),
      children: symbol.children.map(c => this.documentSymbolToNode(c)),
    };
  }

  /**
   * Extract signature from DocumentSymbol
   */
  private extractSignature(symbol: vscode.DocumentSymbol): string {
    if (symbol.detail) {
      return symbol.detail;
    }
    return symbol.name;
  }

  /**
   * Format types section with hierarchical structure
   */
  private formatTypeSection(types: SymbolNode[], document: vscode.TextDocument): string {
    const lines: string[] = [];

    lines.push(OUTLINE_SEPARATOR);
    lines.push(`// ${SECTION_TITLES.TYPES_WITH_COUNT(this.countNodes(types))}`);
    lines.push(OUTLINE_SEPARATOR);

    for (const type of types) {
      this.formatTypeNode(type, lines, document, 0);
    }

    return lines.join('\n');
  }

  /**
   * Format a single type node with its children
   */
  private formatTypeNode(node: SymbolNode, lines: string[], document: vscode.TextDocument, depth: number): void {
    const indent = '//   '.repeat(depth);
    const lineInfo = this.getLineInfo(node.range, document);
    const kindName = this.getSymbolKindName(node.kind);

    // Type declaration
    if (depth === 0) {
      lines.push(`${indent}// ${kindName} ${node.signature}${lineInfo}`);
    } else {
      lines.push(`${indent}// ${node.signature}${lineInfo}`);
    }

    // Format members (methods, properties)
    const members = node.children.filter(c => this.isMemberSymbol(c.kind));
    for (const member of members) {
      const memberIndent = '//   '.repeat(depth + 1);
      const memberLineInfo = this.getLineInfo(member.range, document);
      const memberKind = this.getSymbolKindName(member.kind);
      const visibility = this.getVisibility(member.name);

      if (visibility) {
        lines.push(`${memberIndent}// ${visibility} ${memberKind} ${member.name}${memberLineInfo}`);
      } else {
        lines.push(`${memberIndent}// ${memberKind} ${member.name}${memberLineInfo}`);
      }
    }

    // Format nested types
    const nestedTypes = node.children.filter(c => this.isTypeSymbol(c.kind));
    for (const nested of nestedTypes) {
      this.formatTypeNode(nested, lines, document, depth + 1);
    }
  }

  /**
   * Format functions section
   */
  private formatFunctionSection(functions: SymbolNode[], document: vscode.TextDocument): string {
    const lines: string[] = [];

    lines.push(OUTLINE_SEPARATOR);
    lines.push(`// ${SECTION_TITLES.FUNCTIONS_WITH_COUNT(this.countNodes(functions))}`);
    lines.push(OUTLINE_SEPARATOR);

    for (const fn of functions) {
      const lineInfo = this.getLineInfo(fn.range, document);
      const async = fn.name.includes('async') ? 'async ' : '';
      lines.push(`// ${async}${fn.signature}${lineInfo}`);
    }

    return lines.join('\n');
  }

  /**
   * Format imports section
   */
  private formatImportSection(namespaces: SymbolNode[]): string {
    const lines: string[] = [];

    lines.push(OUTLINE_SEPARATOR);
    lines.push(`// ${SECTION_TITLES.IMPORTS_WITH_COUNT(namespaces.length)}`);
    lines.push(OUTLINE_SEPARATOR);

    for (const ns of namespaces) {
      lines.push(`// ${ns.name}`);
    }

    return lines.join('\n');
  }

  /**
   * Get line information for a symbol
   */
  private getLineInfo(range: vscode.Range, document: vscode.TextDocument): string {
    const line = range.start.line;
    const lineText = document.lineAt(line).text.trim();
    const signature = extractCodeSignature(lineText);

    if (signature && signature.length < 100) {
      return ` → ${signature}`;
    }
    return ` [L${line + 1}]`;
  }

  /**
   * Get visibility modifier from name
   */
  private getVisibility(name: string): string | null {
    if (name.startsWith('#')) return 'private (#)';
    if (name.startsWith('_')) return 'protected (_)';
    if (name.startsWith('get ')) return 'getter';
    if (name.startsWith('set ')) return 'setter';
    return null;
  }

  /**
   * Check if symbol kind is a member
   */
  private isMemberSymbol(kind: vscode.SymbolKind): boolean {
    return kind === vscode.SymbolKind.Method ||
           kind === vscode.SymbolKind.Property ||
           kind === vscode.SymbolKind.Field ||
           kind === vscode.SymbolKind.Constructor;
  }

  /**
   * Count total nodes including children
   */
  private countNodes(nodes: SymbolNode[]): number {
    let count = 0;
    for (const node of nodes) {
      count += 1;
      count += this.countNodes(node.children);
    }
    return count;
  }

  /**
   * Get human-readable symbol kind name
   */
  private getSymbolKindName(kind: vscode.SymbolKind): string {
    const names: Partial<Record<vscode.SymbolKind, string>> = {
      [vscode.SymbolKind.Class]: 'class',
      [vscode.SymbolKind.Interface]: 'interface',
      [vscode.SymbolKind.Struct]: 'struct',
      [vscode.SymbolKind.Enum]: 'enum',
      [vscode.SymbolKind.Method]: 'method',
      [vscode.SymbolKind.Property]: 'property',
      [vscode.SymbolKind.Field]: 'field',
      [vscode.SymbolKind.Constructor]: 'constructor',
      [vscode.SymbolKind.Function]: 'function',
    };
    return names[kind] || 'unknown';
  }
}
