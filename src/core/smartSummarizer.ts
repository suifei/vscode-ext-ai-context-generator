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
    const summaryExtensions = new Set([
      '.log', '.csv', '.tsv', '.json', '.yaml', '.yml', '.xml', '.md', '.txt',
    ]);
    return summaryExtensions.has(ext);
  }

  async summarize(fileResult: FileReadResult): Promise<string> {
    const ext = path.extname(fileResult.path).toLowerCase();

    switch (ext) {
      case '.log':
        return this.logAnalyzer.summarize(fileResult);
      case '.csv':
      case '.tsv':
        return this.csvAnalyzer.summarize(fileResult);
      case '.json':
      case '.yaml':
      case '.yml':
      case '.xml':
        return this.configAnalyzer.summarize(fileResult);
      case '.md':
        return this.docAnalyzer.summarize(fileResult);
      default:
        return this.genericAnalyzer.summarize(fileResult);
    }
  }
}
