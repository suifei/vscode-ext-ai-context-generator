/**
 * Unit tests for OutlineExtractor
 */

import { expect } from 'chai';
import { OutlineExtractor } from '../../../src/outline/outlineExtractor';
import * as vscode from 'vscode';

describe('OutlineExtractor', () => {
  let extractor: OutlineExtractor;

  before(() => {
    extractor = new OutlineExtractor();
  });

  describe('getSymbols', () => {
    it('should return empty array when LSP fails gracefully', async () => {
      // Create a minimal mock document
      const mockDoc = {
        uri: vscode.Uri.parse('file:///test.ts'),
        languageId: 'typescript',
        getText: () => '',
      } as unknown as vscode.TextDocument;

      // This should not throw even if LSP is unavailable
      const symbols = await extractor['getSymbols'](mockDoc);
      expect(symbols).to.be.an('array');
      expect(symbols).to.be.not.undefined;
    });

    it('should handle undefined LSP response', async () => {
      const mockDoc = {
        uri: vscode.Uri.parse('file:///test.js'),
        languageId: 'javascript',
        getText: () => '',
      } as unknown as vscode.TextDocument;

      const symbols = await extractor['getSymbols'](mockDoc);
      expect(Array.isArray(symbols)).to.be.true;
    });
  });

  describe('extract', () => {
    it('should handle extraction errors gracefully', async () => {
      const mockDoc = {
        uri: vscode.Uri.parse('file:///error.ts'),
        languageId: 'typescript',
        getText: () => '',
      } as unknown as vscode.TextDocument;

      // Should not throw, should return empty string on error
      const result = await extractor.extract(mockDoc);
      expect(result).to.be.a('string');
    });
  });

  describe('formatSymbols', () => {
    it('should format empty symbols array', () => {
      const mockDoc = {
        uri: vscode.Uri.parse('file:///test.ts'),
        languageId: 'typescript',
        getText: () => '',
        lineAt: () => ({ text: '' }),
      } as unknown as vscode.TextDocument;

      const result = extractor['formatSymbols']([], mockDoc);
      expect(result).to.be.a('string');
    });

    it('should format class symbols correctly', () => {
      const symbols: vscode.SymbolInformation[] = [
        {
          kind: vscode.SymbolKind.Class,
          name: 'TestClass',
          location: new vscode.Location(
            vscode.Uri.parse('file:///test.ts'),
            new vscode.Position(0, 0)
          ),
          containerName: '',
        },
      ];

      const mockDoc = {
        uri: vscode.Uri.parse('file:///test.ts'),
        languageId: 'typescript',
        getText: () => 'export class TestClass {}',
        lineAt: () => ({ text: 'export class TestClass {}' }),
      } as unknown as vscode.TextDocument;

      const result = extractor['formatSymbols'](symbols, mockDoc);
      expect(result).to.include('TYPES');
      expect(result).to.include('TestClass');
    });

    it('should format function symbols correctly', () => {
      const symbols: vscode.SymbolInformation[] = [
        {
          kind: vscode.SymbolKind.Function,
          name: 'testFunction',
          location: new vscode.Location(
            vscode.Uri.parse('file:///test.ts'),
            new vscode.Position(5, 0)
          ),
          containerName: '',
        },
      ];

      const mockDoc = {
        uri: vscode.Uri.parse('file:///test.ts'),
        languageId: 'typescript',
        getText: () => 'function testFunction() {}',
        lineAt: () => ({ text: 'function testFunction() {}' }),
      } as unknown as vscode.TextDocument;

      const result = extractor['formatSymbols'](symbols, mockDoc);
      expect(result).to.include('FUNCTIONS');
      expect(result).to.include('testFunction');
    });

    it('should group symbols by kind', () => {
      const symbols: vscode.SymbolInformation[] = [
        {
          kind: vscode.SymbolKind.Class,
          name: 'MyClass',
          location: new vscode.Location(
            vscode.Uri.parse('file:///test.ts'),
            new vscode.Position(0, 0)
          ),
          containerName: '',
        },
        {
          kind: vscode.SymbolKind.Function,
          name: 'myFunction',
          location: new vscode.Location(
            vscode.Uri.parse('file:///test.ts'),
            new vscode.Position(10, 0)
          ),
          containerName: '',
        },
        {
          kind: vscode.SymbolKind.Interface,
          name: 'MyInterface',
          location: new vscode.Location(
            vscode.Uri.parse('file:///test.ts'),
            new vscode.Position(5, 0)
          ),
          containerName: '',
        },
      ];

      const mockDoc = {
        uri: vscode.Uri.parse('file:///test.ts'),
        languageId: 'typescript',
        getText: () => '',
        lineAt: () => ({ text: '' }),
      } as unknown as vscode.TextDocument;

      const result = extractor['formatSymbols'](symbols, mockDoc);
      // Both class and interface should be in TYPES section
      expect(result).to.include('TYPES');
      expect(result).to.include('FUNCTIONS');
    });
  });

  describe('getSymbolLine', () => {
    it('should truncate long lines', () => {
      const symbol: vscode.SymbolInformation = {
        kind: vscode.SymbolKind.Function,
        name: 'longFunction',
        location: new vscode.Location(
          vscode.Uri.parse('file:///test.ts'),
          new vscode.Position(0, 0)
        ),
        containerName: '',
      };

      const longLine = 'a'.repeat(200);
      const mockDoc = {
        uri: vscode.Uri.parse('file:///test.ts'),
        languageId: 'typescript',
        getText: () => longLine,
        lineAt: () => ({ text: longLine }),
      } as unknown as vscode.TextDocument;

      const result = extractor['getSymbolLine'](symbol, mockDoc);
      expect(result.length).to.be.at.most(150);
    });

    it('should handle empty lines', () => {
      const symbol: vscode.SymbolInformation = {
        kind: vscode.SymbolKind.Variable,
        name: 'testVar',
        location: new vscode.Location(
          vscode.Uri.parse('file:///test.ts'),
          new vscode.Position(0, 0)
        ),
        containerName: '',
      };

      const mockDoc = {
        uri: vscode.Uri.parse('file:///test.ts'),
        languageId: 'typescript',
        getText: () => '',
        lineAt: () => ({ text: '' }),
      } as unknown as vscode.TextDocument;

      const result = extractor['getSymbolLine'](symbol, mockDoc);
      expect(result).to.be.a('string');
    });
  });
});
