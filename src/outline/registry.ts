/**
 * Registry for language ID to outline extractor mapping
 */

import * as vscode from 'vscode';
import { OutlineExtractor } from './outlineExtractor';
import { ASTExtractor } from './astExtractor';
import { RegexFallback } from './regexFallback';
import { Logger } from '../core/logger';

export class OutlineExtractorRegistry {
  private static readonly SUPPORTED_LANGUAGES = new Set([
    'typescript', 'typescriptreact',
    'javascript', 'javascriptreact',
    'python',
    'go',
    'rust',
    'java',
    'c', 'cpp', 'csharp',
  ]);

  // Enhanced AST extractor for languages with good LSP support
  private static readonly astExtractor = new ASTExtractor();
  // Basic extractor as fallback
  private static readonly basicExtractor = new OutlineExtractor();
  // Regex-based fallback for all languages
  private static readonly regexFallback = new RegexFallback();

  /**
   * Extract outline from document using the best available method
   *
   * Extraction strategy:
   * 1. ASTExtractor (hierarchical DocumentSymbol API) for supported languages
   * 2. Basic OutlineExtractor (flat SymbolInformation API) as intermediate
   * 3. RegexFallback as final fallback
   */
  static async extractOutline(document: vscode.TextDocument): Promise<string> {
    const languageId = document.languageId.toLowerCase();

    // Try AST extractor first for supported languages
    if (this.SUPPORTED_LANGUAGES.has(languageId)) {
      Logger.debug(`Using AST extractor for ${languageId}`);
      let result = await this.astExtractor.extract(document);

      if (this.isValidOutline(result)) {
        return result;
      }

      // AST extraction insufficient, try basic extractor
      Logger.debug(`AST extraction insufficient, trying basic extractor`);
      result = await this.basicExtractor.extract(document);

      if (this.isValidOutline(result)) {
        return result;
      }
    }

    // Use regex fallback for unsupported languages or when LSP fails
    Logger.debug(`Using regex fallback for ${document.uri.fsPath}`);
    return await this.regexFallback.extract(document);
  }

  /**
   * Check if outline contains valid symbol definitions
   */
  private static isValidOutline(outline: string): boolean {
    if (!outline || outline.trim().length === 0) return false;

    // Check for actual symbol definitions (section headers)
    const hasSymbols = /^\/\/\s+TYPES|FUNCTIONS|IMPORTS|DEPENDENCIES/m.test(outline);

    // Also check for reasonable content length
    const hasContent = outline.trim().length >= 50;

    return hasSymbols && hasContent;
  }

  /**
   * Check if a language has AST support (uses VSCode LSP)
   */
  static hasASTSupport(languageId: string): boolean {
    return this.SUPPORTED_LANGUAGES.has(languageId.toLowerCase());
  }

  /**
   * Get list of supported language IDs
   */
  static getSupportedLanguages(): string[] {
    return [...this.SUPPORTED_LANGUAGES];
  }
}
