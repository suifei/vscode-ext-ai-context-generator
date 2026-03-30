/**
 * CSV/TSV analyzer: schema inference, type detection, sampling
 */

import { FileReadResult } from '../core/fileReader';
import { AIContextConfig, WARNING_EMOJI } from '../config/constants';
import { getRelativePath } from '../utils/fileUtils';

export class CsvAnalyzer {
  constructor(
    private config: AIContextConfig,
    private workspaceRoot: string
  ) {}

  summarize(fileResult: FileReadResult): string {
    const relativePath = getRelativePath(this.workspaceRoot, fileResult.path);
    const lines = fileResult.content.split('\n').filter(l => l.trim());

    if (lines.length === 0) {
      return `// File: ${relativePath} (${WARNING_EMOJI} Empty CSV)\n`;
    }

    const delimiter = this.detectDelimiter(lines[0]);
    const headers = this.parseLine(lines[0], delimiter);
    const dataRows = lines.slice(1);

    const { columnTypes, sampleValues } = this.analyzeColumns(dataRows, headers.length, delimiter);

    return this.buildOutput(relativePath, dataRows, headers, columnTypes, sampleValues, delimiter);
  }

  private detectDelimiter(line: string): string {
    const delimiters = ['\t', ',', ';', '|'];
    let maxCount = 0;
    let detected = ',';

    for (const delim of delimiters) {
      const count = (line.match(new RegExp(this.escapeRegex(delim), 'g')) || []).length;
      if (count > maxCount) {
        maxCount = count;
        detected = delim;
      }
    }

    return detected;
  }

  private parseLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  private analyzeColumns(dataRows: string[], headerCount: number, delimiter: string) {
    const columnTypes: string[] = new Array(headerCount).fill('string');
    const sampleValues: string[][] = Array.from({ length: headerCount }, () => []);

    const rowsToAnalyze = Math.min(dataRows.length, 100);

    for (let i = 0; i < rowsToAnalyze; i++) {
      const values = this.parseLine(dataRows[i], delimiter);

      for (let j = 0; j < Math.min(values.length, headerCount); j++) {
        const value = values[j]?.trim() || '';

        if (sampleValues[j].length < 3) {
          sampleValues[j].push(value);
        }

        columnTypes[j] = this.inferType(columnTypes[j], value);
      }
    }

    return { columnTypes, sampleValues };
  }

  private inferType(currentType: string, value: string): string {
    if (!value) return currentType;

    const typeChecks = [
      { regex: /^-?\d+$/, type: 'integer' },
      { regex: /^-?\d+\.\d+$/, type: 'float' },
      { regex: /^(true|false|yes|no|1|0)$/i, type: 'boolean' },
      { regex: /^\d{4}-\d{2}-\d{2}/, type: 'date' },
    ];

    if (currentType === 'string') {
      for (const { regex, type } of typeChecks) {
        if (regex.test(value)) return type;
      }
    } else if (currentType === 'integer' && !/^-?\d+$/.test(value)) {
      return /^-?\d+\.\d+$/.test(value) ? 'float' : 'string';
    } else if (currentType === 'float' && !/^-?\d+\.\d+$/.test(value)) {
      return 'string';
    }

    return currentType;
  }

  private buildOutput(
    relativePath: string,
    dataRows: string[],
    headers: string[],
    columnTypes: string[],
    sampleValues: string[][],
    delimiter: string
  ): string {
    let output = `// File: ${relativePath} (${WARNING_EMOJI} CSV/TSV summary)\n`;
    output += `// Total rows: ${dataRows.length}\n`;
    output += `// Delimiter: "${delimiter === '\t' ? '\\t' : delimiter}"\n\n`;

    output += `// ═══════════════════════════════════════\n`;
    output += `// SCHEMA (${headers.length} columns)\n`;
    output += `// ═══════════════════════════════════════\n`;

    for (let i = 0; i < headers.length; i++) {
      const samples = sampleValues[i].filter(v => v).slice(0, 2);
      const sampleStr = samples.length > 0 ? ` (examples: "${samples.join('", "')}")` : '';
      output += `// ${headers[i]}: ${columnTypes[i]}${sampleStr}\n`;
    }

    output += '\n';

    const sampleRows = Math.min(this.config.csvSampleRows, dataRows.length);
    output += `// ═══════════════════════════════════════\n`;
    output += `// SAMPLE DATA (first ${sampleRows} rows)\n`;
    output += `// ═══════════════════════════════════════\n`;

    for (const row of dataRows.slice(0, sampleRows)) {
      output += `// ${row.substring(0, 200)}\n`;
    }

    if (dataRows.length > sampleRows) {
      output += `// ... (${dataRows.length - sampleRows} more rows)\n`;
    }

    return output;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
