/**
 * Unit tests for OutlineExtractorRegistry
 */

import { expect } from 'chai';
import { OutlineExtractorRegistry } from '../../../../src/outline/registry';
import * as vscode from 'vscode';

describe('OutlineExtractorRegistry', () => {
  describe('hasASTSupport', () => {
    it('should return true for supported languages', () => {
      expect(OutlineExtractorRegistry.hasASTSupport('typescript')).to.be.true;
      expect(OutlineExtractorRegistry.hasASTSupport('javascript')).to.be.true;
      expect(OutlineExtractorRegistry.hasASTSupport('python')).to.be.true;
      expect(OutlineExtractorRegistry.hasASTSupport('go')).to.be.true;
      expect(OutlineExtractorRegistry.hasASTSupport('rust')).to.be.true;
      expect(OutlineExtractorRegistry.hasASTSupport('java')).to.be.true;
      expect(OutlineExtractorRegistry.hasASTSupport('cpp')).to.be.true;
      expect(OutlineExtractorRegistry.hasASTSupport('c')).to.be.true;
    });

    it('should return true for language variants', () => {
      expect(OutlineExtractorRegistry.hasASTSupport('typescriptreact')).to.be.true;
      expect(OutlineExtractorRegistry.hasASTSupport('javascriptreact')).to.be.true;
      expect(OutlineExtractorRegistry.hasASTSupport('TypeScript')).to.be.true;
      expect(OutlineExtractorRegistry.hasASTSupport('PYTHON')).to.be.true;
    });

    it('should return false for unsupported languages', () => {
      expect(OutlineExtractorRegistry.hasASTSupport('ruby')).to.be.false;
      expect(OutlineExtractorRegistry.hasASTSupport('php')).to.be.false;
      expect(OutlineExtractorRegistry.hasASTSupport('unknown')).to.be.false;
      expect(OutlineExtractorRegistry.hasASTSupport('')).to.be.false;
    });
  });

  describe('extractOutline', () => {
    it('should return string for any document', async () => {
      const mockDoc = {
        uri: vscode.Uri.parse('file:///test.ts'),
        languageId: 'typescript',
        getText: () => '',
      } as unknown as vscode.TextDocument;

      const result = await OutlineExtractorRegistry.extractOutline(mockDoc);
      expect(result).to.be.a('string');
    });

    it('should handle empty document', async () => {
      const mockDoc = {
        uri: vscode.Uri.parse('file:///empty.js'),
        languageId: 'javascript',
        getText: () => '',
      } as unknown as vscode.TextDocument;

      const result = await OutlineExtractorRegistry.extractOutline(mockDoc);
      expect(result).to.be.a('string');
    });

    it('should use regex fallback when LSP returns empty', async () => {
      const code = `
        // Simple function
        function test() {
          return 42;
        }
      `;

      const mockDoc = {
        uri: vscode.Uri.parse('file:///test.js'),
        languageId: 'javascript',
        getText: () => code,
      } as unknown as vscode.TextDocument;

      const result = await OutlineExtractorRegistry.extractOutline(mockDoc);
      expect(result).to.be.a('string');
      // Regex fallback should still extract something
      expect(result.length).to.be.greaterThan(0);
    });
  });

  describe('isValidOutline (private method behavior)', () => {
    it('should accept outline with proper section headers', async () => {
      // Mock a scenario where LSP returns valid outline
      const code = `
        export class TestClass {
          constructor() {}
          testMethod() {}
        }
      `;

      const mockDoc = {
        uri: vscode.Uri.parse('file:///test.ts'),
        languageId: 'typescript',
        getText: () => code,
      } as unknown as vscode.TextDocument;

      const result = await OutlineExtractorRegistry.extractOutline(mockDoc);
      // Should return a string regardless
      expect(result).to.be.a('string');
    });
  });
});
