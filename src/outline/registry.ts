/**
 * Registry for language ID to outline extractor mapping
 */

import * as vscode from 'vscode';
import { OutlineExtractor } from './outlineExtractor';
import { TypescriptExtractor } from './typescriptExtractor';
import { PythonExtractor } from './pythonExtractor';
import { GoExtractor } from './goExtractor';
import { RustExtractor } from './rustExtractor';
import { JavaExtractor } from './javaExtractor';
import { CCppExtractor } from './cCppExtractor';
import { RegexFallback } from './regexFallback';

export class OutlineExtractorRegistry {
  private static extractors: Map<string, OutlineExtractor> = new Map();

  /**
   * Initialize all extractors
   */
  static initialize(): void {
    this.extractors.set('typescript', new TypescriptExtractor());
    this.extractors.set('javascript', new TypescriptExtractor());
    this.extractors.set('python', new PythonExtractor());
    this.extractors.set('go', new GoExtractor());
    this.extractors.set('rust', new RustExtractor());
    this.extractors.set('java', new JavaExtractor());
    this.extractors.set('c', new CCppExtractor());
    this.extractors.set('cpp', new CCppExtractor());
    this.extractors.set('csharp', new CCppExtractor());

    // Add regex fallback for all other languages
    const fallback = new RegexFallback();
  }

  /**
   * Get extractor for language ID
   */
  static getExtractor(languageId: string): OutlineExtractor {
    const extractor = this.extractors.get(languageId);
    if (extractor) {
      return extractor;
    }

    // Return regex fallback for unknown languages
    return new RegexFallback();
  }

  /**
   * Extract outline from document
   */
  static async extractOutline(document: vscode.TextDocument): Promise<string> {
    const languageId = document.languageId;
    const extractor = this.getExtractor(languageId);

    return await extractor.extract(document);
  }

  /**
   * Check if a language has AST support
   */
  static hasASTSupport(languageId: string): boolean {
    return this.extractors.has(languageId);
  }
}
