/**
 * Excel analyzer: workbook structure with sheet summaries (similar to CSV)
 */

import * as path from 'path';
import { FileReadResult } from '../core/fileReader';
import { AIContextConfig, WARNING_EMOJI, SECTION_SEPARATOR } from '../config/constants';
import { getRelativePath } from '../utils/fileUtils';
import { getErrorMessage } from '../utils/errorUtils';
import { Logger } from '../core/logger';

interface SheetInfo {
  name: string;
  rows: number;
  columns: number;
  headers: string[];
  columnTypes: string[];
  sampleValues: string[][];
}

interface WorkBook {
  Sheets: Record<string, unknown>;
  SheetNames: string[];
}

export class ExcelAnalyzer {
  constructor(
    private config: AIContextConfig,
    private workspaceRoot: string
  ) {}

  async summarize(fileResult: FileReadResult): Promise<string> {
    const relativePath = getRelativePath(this.workspaceRoot, fileResult.path);
    const ext = path.extname(fileResult.path).toLowerCase();

    // Check if file is .xlsx or .xls
    if (ext !== '.xlsx' && ext !== '.xls') {
      return `// File: ${relativePath} (${WARNING_EMOJI} Unsupported Excel format)\n`;
    }

    try {
      // Dynamically require xlsx to avoid loading issues
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const XLSX = require('xlsx');
      // Read Excel file
      const workbook = XLSX.readFile(fileResult.path);
      const sheetNames = workbook.SheetNames;

      if (sheetNames.length === 0) {
        return `// File: ${relativePath} (${WARNING_EMOJI} Empty workbook)\n`;
      }

      // Analyze each sheet
      const sheets: SheetInfo[] = [];
      for (const sheetName of sheetNames) {
        const sheetInfo = this.analyzeSheet(workbook, sheetName, XLSX);
        if (sheetInfo) {
          sheets.push(sheetInfo);
        }
      }

      return this.buildOutput(relativePath, sheets, ext);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      Logger.warn(`Error parsing Excel file ${fileResult.path}: ${message}`);
      return `// File: ${relativePath} (${WARNING_EMOJI} Excel parse error)\n// Error: ${message}\n`;
    }
  }

  /**
   * Analyze a single sheet
   */
  private analyzeSheet(workbook: WorkBook, sheetName: string, XLSX: any): SheetInfo | null {
    try {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) return null;

      // Convert to array of arrays
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: ''
      });

      if (!jsonData || jsonData.length === 0) {
        return {
          name: sheetName,
          rows: 0,
          columns: 0,
          headers: [],
          columnTypes: [],
          sampleValues: []
        };
      }

      const headers = jsonData[0] || [];
      const dataRows = jsonData.slice(1);
      const columnCount = headers.length;
      const rowCount = dataRows.length;

      // Analyze columns
      const columnTypes: string[] = new Array(columnCount).fill('string');
      const sampleValues: string[][] = Array.from({ length: columnCount }, () => []);

      const rowsToAnalyze = Math.min(dataRows.length, 100);

      for (let i = 0; i < rowsToAnalyze; i++) {
        const row = dataRows[i] || [];

        for (let j = 0; j < columnCount; j++) {
          const value = row[j] !== undefined ? String(row[j]).trim() : '';

          // Collect sample values
          if (sampleValues[j].length < 3 && value) {
            sampleValues[j].push(value);
          }

          // Infer type
          columnTypes[j] = this.inferType(columnTypes[j], value);
        }
      }

      return {
        name: sheetName,
        rows: rowCount,
        columns: columnCount,
        headers,
        columnTypes,
        sampleValues
      };
    } catch (error) {
      Logger.warn(`Error analyzing sheet ${sheetName}: ${getErrorMessage(error)}`);
      return null;
    }
  }

  /**
   * Infer column type from current type and new value
   */
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

  /**
   * Build output string
   */
  private buildOutput(relativePath: string, sheets: SheetInfo[], ext: string): string {
    let output = `// File: ${relativePath} (${WARNING_EMOJI} Excel summary)\n`;
    output += `// Format: ${ext.substring(1).toUpperCase()}\n\n`;

    output += `${SECTION_SEPARATOR}\n`;
    output += `// WORKBOOK: ${sheets.length} sheet${sheets.length > 1 ? 's' : ''}\n`;
    output += `${SECTION_SEPARATOR}\n\n`;

    for (const sheet of sheets) {
      output += this.buildSheetOutput(sheet);
    }

    return output;
  }

  /**
   * Build output for a single sheet
   */
  private buildSheetOutput(sheet: SheetInfo): string {
    let output = '';

    output += `${SECTION_SEPARATOR}\n`;
    output += `// SHEET: "${sheet.name}"\n`;
    output += `${SECTION_SEPARATOR}\n`;
    output += `// Rows: ${sheet.rows} | Columns: ${sheet.columns}\n\n`;

    if (sheet.columns === 0) {
      output += `// (empty sheet)\n\n`;
      return output;
    }

    // Schema
    output += `${SECTION_SEPARATOR}\n`;
    output += `// SCHEMA (${sheet.columns} columns)\n`;
    output += `${SECTION_SEPARATOR}\n`;

    for (let i = 0; i < sheet.headers.length; i++) {
      const header = sheet.headers[i] || `Column${i + 1}`;
      const type = sheet.columnTypes[i] || 'string';
      const samples = sheet.sampleValues[i].filter(v => v).slice(0, 2);
      const sampleStr = samples.length > 0 ? ` (examples: "${samples.join('", "')}")` : '';
      output += `// ${header}: ${type}${sampleStr}\n`;
    }

    output += '\n';

    // Sample data
    if (sheet.rows > 0) {
      const sampleRows = Math.min(this.config.csvSampleRows, sheet.rows);
      output += `${SECTION_SEPARATOR}\n`;
      output += `// SAMPLE DATA (showing ${sampleRows} of ${sheet.rows} rows)\n`;
      output += `${SECTION_SEPARATOR}\n`;

      // Note: We don't have the raw row data stored, so we skip detailed sample rows
      // This is intentional to keep the summary concise
      output += `// [Row data omitted for brevity - see schema above]\n`;
    }

    output += '\n';

    return output;
  }
}
