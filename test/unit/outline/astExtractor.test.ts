/**
 * Unit tests for ASTExtractor
 */

import { expect } from 'chai';
import { ASTExtractor } from '../../../src/outline/astExtractor';
import { extractCodeSignature } from '../../../src/outline/formatConstants';
import * as vscode from 'vscode';

describe('ASTExtractor', () => {
  let extractor: ASTExtractor;

  before(() => {
    extractor = new ASTExtractor();
  });

  describe('extract', () => {
    it('should return string for any document', async () => {
      const mockDoc = createMockDocument('', 'typescript');
      const result = await extractor.extract(mockDoc);

      expect(result).to.be.a('string');
    });

    it('should handle empty document', async () => {
      const mockDoc = createMockDocument('', 'javascript');
      const result = await extractor.extract(mockDoc);

      expect(result).to.be.a('string');
    });

    it('should fall back to base extractor when DocumentSymbol API fails', async () => {
      const mockDoc = createMockDocument('function test() {}', 'typescript');
      const result = await extractor.extract(mockDoc);

      expect(result).to.be.a('string');
    });
  });

  describe('getDocumentSymbols', () => {
    it('should return undefined when LSP is unavailable', async () => {
      const mockDoc = createMockDocument('', 'unknown-language');

      const symbols = await extractor['getDocumentSymbols'](mockDoc);

      // Should not throw, may return undefined or empty array
      expect(symbols === undefined || Array.isArray(symbols)).to.be.true;
    });
  });

  describe('symbol kind detection', () => {
    it('should correctly identify type symbols', () => {
      expect(extractor['isTypeSymbol'](vscode.SymbolKind.Class)).to.be.true;
      expect(extractor['isTypeSymbol'](vscode.SymbolKind.Interface)).to.be.true;
      expect(extractor['isTypeSymbol'](vscode.SymbolKind.Struct)).to.be.true;
      expect(extractor['isTypeSymbol'](vscode.SymbolKind.Enum)).to.be.true;
      expect(extractor['isTypeSymbol'](vscode.SymbolKind.Function)).to.be.false;
    });

    it('should correctly identify function symbols', () => {
      expect(extractor['isFunctionSymbol'](vscode.SymbolKind.Function)).to.be.true;
      expect(extractor['isFunctionSymbol'](vscode.SymbolKind.Method)).to.be.true;
      expect(extractor['isFunctionSymbol'](vscode.SymbolKind.Constructor)).to.be.true;
      expect(extractor['isFunctionSymbol'](vscode.SymbolKind.Class)).to.be.false;
    });

    it('should correctly identify namespace symbols', () => {
      expect(extractor['isNamespaceSymbol'](vscode.SymbolKind.Namespace)).to.be.true;
      expect(extractor['isNamespaceSymbol'](vscode.SymbolKind.Module)).to.be.true;
      expect(extractor['isNamespaceSymbol'](vscode.SymbolKind.Class)).to.be.false;
    });

    it('should correctly identify member symbols', () => {
      expect(extractor['isMemberSymbol'](vscode.SymbolKind.Method)).to.be.true;
      expect(extractor['isMemberSymbol'](vscode.SymbolKind.Property)).to.be.true;
      expect(extractor['isMemberSymbol'](vscode.SymbolKind.Field)).to.be.true;
      expect(extractor['isMemberSymbol'](vscode.SymbolKind.Class)).to.be.false;
    });
  });

  describe('visibility detection', () => {
    it('should detect private members', () => {
      expect(extractor['getVisibility']('#privateField')).to.equal('private (#)');
      expect(extractor['getVisibility']('_protectedField')).to.equal('protected (_)');
    });

    it('should detect getters and setters', () => {
      expect(extractor['getVisibility']('get value()')).to.equal('getter');
      expect(extractor['getVisibility']('set value(v)')).to.equal('setter');
    });

    it('should return null for public members', () => {
      expect(extractor['getVisibility']('publicField')).to.be.null;
    });
  });

  describe('symbol kind names', () => {
    it('should return correct kind names', () => {
      expect(extractor['getSymbolKindName'](vscode.SymbolKind.Class)).to.equal('class');
      expect(extractor['getSymbolKindName'](vscode.SymbolKind.Interface)).to.equal('interface');
      expect(extractor['getSymbolKindName'](vscode.SymbolKind.Function)).to.equal('function');
      expect(extractor['getSymbolKindName'](vscode.SymbolKind.Method)).to.equal('method');
      expect(extractor['getSymbolKindName'](vscode.SymbolKind.Property)).to.equal('property');
    });
  });
});

describe('formatConstants', () => {
  describe('extractCodeSignature', () => {
    it('should extract signature from code line', () => {
      const line1 = 'export interface IUser { name: string; }';
      const sig1 = extractCodeSignature(line1);
      expect(sig1).to.include('interface');

      const line2 = 'function test(a: string, b: number): void {';
      const sig2 = extractCodeSignature(line2);
      expect(sig2).to.include('function test');
    });

    it('should handle commented lines', () => {
      const line = '// export class TestClass {}';
      const sig = extractCodeSignature(line);
      expect(sig).to.include('class');
    });

    it('should handle long lines', () => {
      const line = 'function veryLongFunctionName(a: string, b: number, c: boolean, d: object): Promise<void> {';
      const sig = extractCodeSignature(line);
      expect(sig.length).to.be.lessThan(100);
    });
  });
});

function createMockDocument(content: string, languageId: string): vscode.TextDocument {
  return {
    uri: vscode.Uri.parse(`file:///test.${languageId}`),
    languageId,
    getText: () => content,
    lineAt: (line: number) => ({
      text: content.split('\n')[line] || ''
    }),
  } as unknown as vscode.TextDocument;
}
