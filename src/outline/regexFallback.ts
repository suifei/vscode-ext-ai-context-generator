/**
 * Regex-based extraction when LSP is unavailable
 * Used as fallback for all languages
 */

import * as vscode from 'vscode';
import { OutlineExtractor } from './outlineExtractor';

export class RegexFallback extends OutlineExtractor {
  async extract(document: vscode.TextDocument): Promise<string> {
    const content = document.getText();
    const lines = content.split('\n');

    let output = `// File: ${document.fileName} (Overview - regex fallback)\n`;
    output += `// Language: ${document.languageId}\n`;
    output += `// ═══════════════════════════════════════\n\n`;

    // Detect patterns based on language
    const patterns = this.getPatternsForLanguage(document.languageId);

    const types: string[] = [];
    const functions: string[] = [];
    const imports: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*')) {
        continue;
      }

      // Check for type patterns
      for (const pattern of patterns.types) {
        const match = trimmed.match(pattern);
        if (match) {
          types.push(trimmed.substring(0, 100));
          break;
        }
      }

      // Check for function patterns
      for (const pattern of patterns.functions) {
        const match = trimmed.match(pattern);
        if (match) {
          functions.push(trimmed.substring(0, 120));
          break;
        }
      }

      // Check for import patterns
      for (const pattern of patterns.imports) {
        const match = trimmed.match(pattern);
        if (match) {
          imports.push(trimmed.substring(0, 100));
          break;
        }
      }
    }

    // Output types
    if (types.length > 0) {
      output += `// ═══════════════════════════════════════\n`;
      output += `// TYPES\n`;
      output += `// ═══════════════════════════════════════\n`;
      for (const type of types.slice(0, 20)) {
        output += `// ${type}\n`;
      }
      if (types.length > 20) {
        output += `// ... (${types.length - 20} more types)\n`;
      }
      output += '\n';
    }

    // Output functions
    if (functions.length > 0) {
      output += `// ═══════════════════════════════════════\n`;
      output += `// FUNCTIONS\n`;
      output += `// ═══════════════════════════════════════\n`;
      for (const fn of functions.slice(0, 30)) {
        output += `// ${fn}\n`;
      }
      if (functions.length > 30) {
        output += `// ... (${functions.length - 30} more functions)\n`;
      }
      output += '\n';
    }

    // Output imports
    if (imports.length > 0) {
      output += `// ═══════════════════════════════════════\n`;
      output += `// IMPORTS\n`;
      output += `// ═══════════════════════════════════════\n`;
      for (const imp of imports.slice(0, 15)) {
        output += `// ${imp}\n`;
      }
      if (imports.length > 15) {
        output += `// ... (${imports.length - 15} more imports)\n`;
      }
    }

    return output;
  }

  private getPatternsForLanguage(languageId: string): { types: RegExp[]; functions: RegExp[]; imports: RegExp[] } {
    const lang = languageId.toLowerCase();

    // TypeScript/JavaScript
    if (lang.includes('typescript') || lang.includes('javascript')) {
      return {
        types: [
          /^(interface|type|class|enum)\s+\w+/,
          /^export\s+(interface|type|class|enum)\s+\w+/,
        ],
        functions: [
          /^(async\s+)?function\s+\w+/,
          /^(const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|\w+)\s*=>/,
          /^\w+\s*\([^)]*\)\s*[:{]/,
        ],
        imports: [
          /^import\s+.*from\s+['"`].+['"`]/,
          /^import\s+{.*}\s+from\s+['"`].+['"`]/,
          /^require\s*\(['"`].+['"`]\)/,
        ],
      };
    }

    // Python
    if (lang.includes('python')) {
      return {
        types: [
          /^class\s+\w+/,
        ],
        functions: [
          /^def\s+\w+\s*\(/,
          /^async\s+def\s+\w+\s*\(/,
        ],
        imports: [
          /^import\s+\w+/,
          /^from\s+.+\s+import/,
        ],
      };
    }

    // Go
    if (lang.includes('go')) {
      return {
        types: [
          /^type\s+\w+\s+(struct|interface)/,
        ],
        functions: [
          /^func\s+\(?\w*\)?\s*\w+/,
        ],
        imports: [
          /^import\s+[("]/,
        ],
      };
    }

    // Rust
    if (lang.includes('rust')) {
      return {
        types: [
          /^(pub\s+)?(struct|enum|trait)\s+\w+/,
        ],
        functions: [
          /^(pub\s+)?(async\s+)?(unsafe\s+)?fn\s+\w+/,
        ],
        imports: [
          /^use\s+.+;/,
        ],
      };
    }

    // C/C++
    if (lang.includes('c') || lang.includes('cpp')) {
      return {
        types: [
          /^(class|struct|enum|union)\s+\w+/,
        ],
        functions: [
          /^\w+(?:\s*\*)+\s*\w+\s*\([^)]*\)/,
          /^\w+\s+\w+\s*\([^)]*\)\s*{/,
        ],
        imports: [
          /^#include\s+<.+>/,
          /^#include\s+".+">/,
        ],
      };
    }

    // Java
    if (lang.includes('java')) {
      return {
        types: [
          /^(public|private|protected)?\s*(static\s+)?(class|interface|enum)\s+\w+/,
        ],
        functions: [
          /^(public|private|protected)?\s*(static\s+)?\w+\s+\w+\s*\([^)]*\)/,
        ],
        imports: [
          /^import\s+.+;/,
        ],
      };
    }

    // Generic fallback
    return {
      types: [
        /^(class|interface|struct|type|enum)\s+\w+/,
      ],
      functions: [
        /^(function|def|func|fn)\s+\w+/,
      ],
      imports: [
        /^(import|use|from)\s+/,
      ],
    };
  }
}
