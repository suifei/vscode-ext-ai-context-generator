/**
 * Registry for language ID to outline extractor mapping
 */

import * as vscode from 'vscode';
import { OutlineExtractor } from './outlineExtractor';
import { LspOutlineExtractor } from './astExtractor';
import { RegexFallback } from './regexFallback';
import { TypeScriptSemanticExtractor } from './typescriptSemanticExtractor';
import { Logger } from '../core/logger';

export interface OutlineOptions {
  /** Detail level: basic, standard, or detailed */
  detail?: 'basic' | 'standard' | 'detailed';
  /** Include private members (starting with _ or #) */
  includePrivate?: boolean;
  /** Extract comments in outline */
  extractComments?: boolean;
  /** Maximum number of items per category */
  maxItems?: number;
}

interface CacheEntry {
  result: string;
  version: number;
  timestamp: number;
}

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

  private static readonly TS_JS_LANGUAGES = new Set([
    'typescript',
    'typescriptreact',
    'javascript',
    'javascriptreact',
  ]);

  /** TS/JS: Compiler API semantic summary first */
  private static readonly semanticExtractor = new TypeScriptSemanticExtractor();

  // Enhanced extractor for languages with good LSP/DocumentSymbol support
  private static readonly lspExtractor = new LspOutlineExtractor();
  // Basic extractor as fallback
  private static readonly basicExtractor = new OutlineExtractor();
  // Regex-based fallback for all languages
  private static readonly regexFallback = new RegexFallback();

  // Cache for outline extraction results
  private static readonly cache = new Map<string, CacheEntry>();
  private static readonly MAX_CACHE_SIZE = 100;
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static cacheAccessOrder: string[] = [];

  /**
   * Extract outline from document using the best available method
   *
   * Extraction strategy:
   * 1. TypeScriptSemanticExtractor (Compiler API) for TS/JS when available
   * 2. LspOutlineExtractor (hierarchical DocumentSymbol API) for supported languages
   * 3. Basic OutlineExtractor (flat SymbolInformation API) as intermediate
   * 4. RegexFallback as final fallback
   *
   * @param document The document to extract outline from
   * @param options Configuration options for outline extraction
   */
  static async extractOutline(document: vscode.TextDocument, options?: OutlineOptions): Promise<string> {
    const languageId = document.languageId.toLowerCase();
    const mergedOptions = this.mergeOptions(options);

    // Check cache first
    const cacheKey = this.getCacheKey(document, mergedOptions);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      Logger.debug(`Using cached outline for ${document.uri.fsPath}`);
      return cached;
    }

    let result: string;

    // TS/JS: try semantic function-level summary first
    if (this.TS_JS_LANGUAGES.has(languageId)) {
      Logger.debug(`Using TypeScript/JavaScript semantic extractor for ${languageId}`);
      result = await this.semanticExtractor.extract(document, mergedOptions);

      if (this.isValidOutline(result)) {
        this.setInCache(cacheKey, result, document.version);
        return result;
      }
    }

    // Try LSP/DocumentSymbol extraction for supported languages
    if (this.SUPPORTED_LANGUAGES.has(languageId)) {
      Logger.debug(`Using LSP symbol extractor for ${languageId}`);
      result = await this.lspExtractor.extract(document, mergedOptions);

      if (this.isValidOutline(result)) {
        this.setInCache(cacheKey, result, document.version);
        return result;
      }

      // Hierarchical symbol extraction insufficient, try basic extractor
      Logger.debug(`LSP DocumentSymbol extraction insufficient, trying SymbolInformation extractor`);
      result = await this.basicExtractor.extract(document, mergedOptions);

      if (this.isValidOutline(result)) {
        this.setInCache(cacheKey, result, document.version);
        return result;
      }
    }

    // Use regex fallback for unsupported languages or when LSP fails
    Logger.debug(`Using regex fallback for ${document.uri.fsPath}`);
    result = await this.regexFallback.extract(document, mergedOptions);
    this.setInCache(cacheKey, result, document.version);
    return result;
  }

  /**
   * Get cache key from document and options
   */
  private static getCacheKey(document: vscode.TextDocument, options: OutlineOptions): string {
    const optionsStr = JSON.stringify(options);
    return `${document.uri.toString()}:${document.version}:${optionsStr}`;
  }

  /**
   * Get entry from cache if valid
   */
  private static getFromCache(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      this.cacheAccessOrder = this.cacheAccessOrder.filter(k => k !== key);
      return null;
    }

    // Update access order for LRU
    this.cacheAccessOrder = this.cacheAccessOrder.filter(k => k !== key);
    this.cacheAccessOrder.push(key);

    return entry.result;
  }

  /**
   * Set entry in cache with LRU eviction
   */
  private static setInCache(key: string, result: string, version: number): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE && !this.cache.has(key)) {
      const oldestKey = this.cacheAccessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      result,
      version,
      timestamp: Date.now(),
    });

    // Update access order
    this.cacheAccessOrder = this.cacheAccessOrder.filter(k => k !== key);
    this.cacheAccessOrder.push(key);
  }

  /**
   * Clear the outline cache
   */
  static clearCache(): void {
    this.cache.clear();
    this.cacheAccessOrder = [];
    Logger.debug('Outline cache cleared');
  }

  /**
   * Merge user options with defaults
   */
  private static mergeOptions(options?: OutlineOptions): Required<OutlineOptions> {
    if (!options) return OutlineExtractor.DEFAULT_OPTIONS;

    return {
      detail: options.detail || OutlineExtractor.DEFAULT_OPTIONS.detail,
      includePrivate: options.includePrivate ?? OutlineExtractor.DEFAULT_OPTIONS.includePrivate,
      extractComments: options.extractComments ?? OutlineExtractor.DEFAULT_OPTIONS.extractComments,
      maxItems: options.maxItems || OutlineExtractor.DEFAULT_OPTIONS.maxItems,
    };
  }

  /**
   * Check if outline contains valid symbol definitions
   */
  private static isValidOutline(outline: string): boolean {
    if (!outline || outline.trim().length === 0) return false;

    // Legacy LSP/regex sections, or TS semantic compact outline (v1.3+)
    const hasLegacyHeader = /^\/\/\s+(TYPES|FUNCTIONS|IMPORTS|DEPENDENCIES)/m.test(outline);
    const hasSemanticCompact = /──\s*semantic|·\s*v1\.\d|^\s*fn\s/m.test(outline);

    const hasContent = outline.trim().length >= 50;

    return (hasLegacyHeader || hasSemanticCompact) && hasContent;
  }

  /**
   * Check if a language has LSP symbol support through VSCode providers
   */
  static hasSymbolSupport(languageId: string): boolean {
    return this.SUPPORTED_LANGUAGES.has(languageId.toLowerCase());
  }

  /**
   * @deprecated Use hasSymbolSupport. Kept for compatibility with older callers/tests.
   */
  static hasASTSupport(languageId: string): boolean {
    return this.hasSymbolSupport(languageId);
  }
}
