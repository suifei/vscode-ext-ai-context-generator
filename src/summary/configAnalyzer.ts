/**
 * Config file analyzer: JSON/YAML structure skeleton + sensitive data redaction
 */

import * as path from 'path';
import { FileReadResult } from '../core/fileReader';
import { AIContextConfig, WARNING_EMOJI } from '../config/constants';
import { getRelativePath } from '../utils/fileUtils';

export class ConfigAnalyzer {
  constructor(
    private config: AIContextConfig,
    private workspaceRoot: string
  ) {}

  summarize(fileResult: FileReadResult): string {
    const relativePath = getRelativePath(this.workspaceRoot, fileResult.path);
    const ext = path.extname(fileResult.path).toLowerCase();

    let parsed: unknown = null;
    let parseError = '';

    try {
      if (ext === '.json') {
        parsed = JSON.parse(fileResult.content);
      } else {
        parsed = this.analyzeYamlStructure(fileResult.content);
      }
    } catch (error: unknown) {
      parseError = error instanceof Error ? error.message : String(error);
    }

    let output = `// File: ${relativePath} (${WARNING_EMOJI} Config structure)\n\n`;

    if (parseError) {
      output += `// Parse error: ${parseError}\n// Showing preview:\n\n`;
      output += fileResult.content.substring(0, 500);
      return output;
    }

    output += `// ═══════════════════════════════════════\n`;
    output += `// CONFIGURATION STRUCTURE\n`;
    output += `// ═══════════════════════════════════════\n\n`;

    output += this.buildStructure(parsed);
    return output;
  }

  private buildStructure(data: unknown): string {
    if (data === null) return '(null)\n';
    if (typeof data === 'boolean') return data + '\n';
    if (typeof data === 'number') return data + '\n';
    if (typeof data === 'string') {
      const safe = data.length > 100 ? `"${data.substring(0, 100)}..."` : `"${data}"`;
      return safe + '\n';
    }
    if (Array.isArray(data)) {
      if (data.length === 0) return '[]\n';
      let output = `array[${data.length}]\n`;
      for (let i = 0; i < Math.min(3, data.length); i++) {
        output += `[${i}]: ${this.formatValue(data[i])}\n`;
      }
      if (data.length > 3) output += `... (${data.length - 3} more items)\n`;
      return output;
    }
    if (typeof data === 'object') {
      let output = '';
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        if (this.isSensitiveKey(key)) {
          output += `${key}: [REDACTED]\n`;
        } else if (typeof value === 'object' && value !== null) {
          output += `${key}:\n${this.indent(this.buildStructure(value))}`;
        } else {
          output += `${key}: ${this.formatValue(value)}\n`;
        }
      }
      return output || '{}\n';
    }
    return String(data) + '\n';
  }

  private formatValue(value: unknown): string {
    if (typeof value === 'string') {
      return value.length > 100 ? `"${value.substring(0, 100)}..."` : `"${value}"`;
    }
    return String(value);
  }

  private isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return this.config.sensitiveKeyPatterns.some(pattern =>
      lowerKey.includes(pattern.toLowerCase())
    );
  }

  private indent(str: string): string {
    return str.split('\n').map(line => '  ' + line).join('\n');
  }

  private analyzeYamlStructure(content: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();

        if (value === 'true' || value === 'false') {
          result[key] = value === 'true';
        } else if (!isNaN(Number(value))) {
          result[key] = Number(value);
        } else if (value) {
          result[key] = value.replace(/^["']|["']$/g, '');
        } else {
          result[key] = '(nested value)';
        }
      }
    }

    return result;
  }
}
