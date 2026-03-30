/**
 * Routes files to appropriate smart summary analyzers
 */

import * as path from 'path';
import { FileReadResult } from './fileReader';
import { AIContextConfig } from '../config/constants';
import { LogAnalyzer } from '../summary/logAnalyzer';
import { CsvAnalyzer } from '../summary/csvAnalyzer';
import { ConfigAnalyzer } from '../summary/configAnalyzer';
import { DocAnalyzer } from '../summary/docAnalyzer';
import { GenericAnalyzer } from '../summary/genericAnalyzer';

// Extension groups for summarization
const LOG_EXTENSIONS = ['.log'];
const CSV_EXTENSIONS = ['.csv', '.tsv'];
const CONFIG_EXTENSIONS = ['.json', '.yaml', '.yml', '.xml'];
const DOC_EXTENSIONS = ['.md', '.txt'];

const SUMMARY_EXTENSIONS = new Set([
  ...LOG_EXTENSIONS,
  ...CSV_EXTENSIONS,
  ...CONFIG_EXTENSIONS,
  ...DOC_EXTENSIONS,
]);

export class SmartSummarizer {
  private logAnalyzer: LogAnalyzer;
  private csvAnalyzer: CsvAnalyzer;
  private configAnalyzer: ConfigAnalyzer;
  private docAnalyzer: DocAnalyzer;
  private genericAnalyzer: GenericAnalyzer;

  constructor(config: AIContextConfig, workspaceRoot: string) {
    this.logAnalyzer = new LogAnalyzer(config, workspaceRoot);
    this.csvAnalyzer = new CsvAnalyzer(config, workspaceRoot);
    this.configAnalyzer = new ConfigAnalyzer(config, workspaceRoot);
    this.docAnalyzer = new DocAnalyzer(config, workspaceRoot);
    this.genericAnalyzer = new GenericAnalyzer(config, workspaceRoot);
  }

  shouldSummarize(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return SUMMARY_EXTENSIONS.has(ext);
  }

  async summarize(fileResult: FileReadResult): Promise<string> {
    const ext = path.extname(fileResult.path).toLowerCase();

    if (LOG_EXTENSIONS.includes(ext)) {
      return this.logAnalyzer.summarize(fileResult);
    }
    if (CSV_EXTENSIONS.includes(ext)) {
      return this.csvAnalyzer.summarize(fileResult);
    }
    if (CONFIG_EXTENSIONS.includes(ext)) {
      return this.configAnalyzer.summarize(fileResult);
    }
    if (DOC_EXTENSIONS.includes(ext)) {
      return this.docAnalyzer.summarize(fileResult);
    }
    return this.genericAnalyzer.summarize(fileResult);
  }
}
