/**
 * Main orchestration - coordinates scanning, reading, and rendering
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { IgnoreFilter } from './ignoreFilter';
import { FileScanner } from './fileScanner';
import { DirTreeGenerator } from './dirTreeGenerator';
import { FileReader, FileReadResult } from './fileReader';
import { TokenCounter } from './tokenCounter';
import { TemplateRenderer, TemplateVariables } from './templateRenderer';
import { SmartSummarizer } from './smartSummarizer';
import { Logger } from './logger';
import { AIContextConfig, DEFAULT_CONFIG, Scope, OutputTarget } from '../config/constants';
import { getRelativePath } from '../utils/fileUtils';

export interface GenerationOptions {
  scope: Scope;
  selectedPaths?: string[];
  templateName?: string;
  outputTarget?: OutputTarget;
}

export interface GenerationResult {
  content: string;
  tokenCount: number;
  fileCount: number;
  outlineCount: number;
  exceededLimit: boolean;
}

const SETTINGS_KEYS = {
  maxFileSize: 'number',
  maxTokens: 'number',
  textPreviewLength: 'number',
  logSampleLines: 'number',
  csvSampleRows: 'number',
  defaultTemplate: 'string',
  sensitiveKeyPatterns: 'array',
  autoDetectLanguage: 'boolean',
  ignorePatterns: 'array',
  binaryFilePatterns: 'array',
  defaultOutputTarget: 'string',
  outputFileName: 'string',
  showTreeEmoji: 'boolean',
  tokenEstimation: 'string',
  parallelFileReads: 'number',
} as const;

export class ContextGenerator {
  private ignoreFilter: IgnoreFilter;
  private fileScanner: FileScanner;
  private fileReader: FileReader;
  private tokenCounter: TokenCounter;
  private templateRenderer: TemplateRenderer;
  private smartSummarizer: SmartSummarizer;
  private workspaceRoot: string;
  private config: AIContextConfig;

  constructor(workspaceRoot: string, config: Partial<AIContextConfig> = {}) {
    this.workspaceRoot = workspaceRoot;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.ignoreFilter = new IgnoreFilter(workspaceRoot, this.config.ignorePatterns);
    this.fileScanner = new FileScanner(this.ignoreFilter);
    this.fileReader = new FileReader(this.config, workspaceRoot);
    this.tokenCounter = new TokenCounter(this.config.tokenEstimation);
    this.templateRenderer = new TemplateRenderer(workspaceRoot);
    this.smartSummarizer = new SmartSummarizer(this.config, workspaceRoot);
  }

  async generate(options: GenerationOptions): Promise<GenerationResult> {
    Logger.logScanStart(options.scope);
    Logger.debug('Generation options:', options);

    // Step 1: Scan for files
    Logger.debug('Step 1: Scanning files...');
    const scanResult = await this.fileScanner.scan({
      scope: options.scope,
      selectedPaths: options.selectedPaths,
    });

    const files = this.fileScanner.sortFiles(scanResult.files);
    Logger.debug(`Scan complete: ${files.length} files found (${scanResult.skipped} skipped)`);

    if (files.length === 0) {
      Logger.warn('No files found after scanning');
      return this.emptyResult();
    }

    // Step 2: Read file contents
    Logger.debug('Step 2: Reading file contents...');
    const fileResults = await this.fileReader.readFiles(files);
    Logger.debug(`File reading complete: ${fileResults.length} files processed`);

    // Step 3: Generate directory tree
    Logger.debug('Step 3: Generating directory tree...');
    const dirTree = new DirTreeGenerator(this.workspaceRoot, {
      showEmoji: this.config.showTreeEmoji,
      selectedFiles: new Set(files),
    }).generate(files);

    // Step 4: Process files
    Logger.debug('Step 4: Processing files (summaries/outlines)...');
    const processedContents = await this.processFiles(fileResults);
    const fileContents = processedContents.join('\n\n');

    // Step 5: Calculate tokens
    Logger.debug('Step 5: Calculating tokens...');
    const tempContent = this.buildTemporaryContent(dirTree, fileContents);
    const tokenCount = this.tokenCounter.count(tempContent);
    Logger.debug(`Token count: ${tokenCount} (limit: ${this.config.maxTokens})`);

    // Step 6: Render template
    Logger.debug('Step 6: Rendering template...');
    const outlineCount = fileResults.filter(r => r.isTruncated).length;
    const content = this.renderTemplate(options.templateName, {
      dirTree,
      fileContents,
      files,
      tokenCount,
      outlineCount,
      selectedPaths: options.selectedPaths,
      scope: options.scope,
    });

    Logger.info(`Generation complete: ${files.length} files, ${tokenCount} tokens, ${outlineCount} outlines`);

    return {
      content,
      tokenCount,
      fileCount: files.length,
      outlineCount,
      exceededLimit: tokenCount > this.config.maxTokens,
    };
  }

  private emptyResult(): GenerationResult {
    return {
      content: '# AI Context\n\nNo files found.',
      tokenCount: 0,
      fileCount: 0,
      outlineCount: 0,
      exceededLimit: false,
    };
  }

  private async processFiles(fileResults: FileReadResult[]): Promise<string[]> {
    const contents: string[] = [];

    for (const result of fileResults) {
      if (result.isBinary) {
        contents.push(this.fileReader.formatFileContent(result));
        continue;
      }

      if (result.isTruncated || this.smartSummarizer.shouldSummarize(result.path)) {
        contents.push(await this.smartSummarizer.summarize(result));
      } else {
        contents.push(this.fileReader.formatFileContent(result));
      }
    }

    return contents;
  }

  private buildTemporaryContent(dirTree: string, fileContents: string): string {
    return `# Project Structure\n${dirTree}\n\n# File Contents\n${fileContents}`;
  }

  private renderTemplate(
    templateName: string | undefined,
    data: {
      dirTree: string;
      fileContents: string;
      files: string[];
      tokenCount: number;
      outlineCount: number;
      selectedPaths?: string[];
      scope: Scope;
    }
  ): string {
    const template = this.templateRenderer.loadTemplate(
      templateName || this.config.defaultTemplate
    );

    const vars: TemplateVariables = {
      PROJECT_NAME: path.basename(this.workspaceRoot),
      DIR_TREE: data.dirTree,
      FILE_LIST: filesToList(this.workspaceRoot, data.files),
      FILE_CONTENTS: data.fileContents,
      TOKEN_COUNT: this.tokenCounter.formatTokenCount(data.tokenCount),
      TOKEN_LIMIT: this.tokenCounter.formatTokenCount(this.config.maxTokens),
      FILE_COUNT: data.files.length.toString(),
      OUTLINE_COUNT: data.outlineCount.toString(),
      TIMESTAMP: new Date().toISOString(),
      SELECTED_FILES: data.selectedPaths
        ? data.selectedPaths.map(p => getRelativePath(this.workspaceRoot, p)).join(', ')
        : '',
      SCOPE: data.scope,
      WORKSPACE_PATH: this.workspaceRoot,
    };

    return this.templateRenderer.render(template, vars);
  }

  updateConfig(config: Partial<AIContextConfig>): void {
    this.config = { ...this.config, ...config };
    this.ignoreFilter.reload(this.config.ignorePatterns);
  }

  reloadFromSettings(): void {
    const vscodeConfig = vscode.workspace.getConfiguration('aiContext');
    const config = this.loadConfigFromSettings(vscodeConfig);
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ignoreFilter.reload(this.config.ignorePatterns);
  }

  private loadConfigFromSettings(vscodeConfig: vscode.WorkspaceConfiguration): Partial<AIContextConfig> {
    const result: Partial<AIContextConfig> = {};

    for (const key of Object.keys(SETTINGS_KEYS)) {
      const defaultValue = DEFAULT_CONFIG[key as keyof AIContextConfig];
      const value = vscodeConfig.get(key, defaultValue);
      (result as any)[key] = value;
    }

    return result;
  }

  getAvailableTemplates(): string[] {
    return this.templateRenderer.getAvailableTemplates();
  }

  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  getMaxTokens(): number {
    return this.config.maxTokens;
  }

  dispose(): void {
    Logger.debug('ContextGenerator disposed');
    this.tokenCounter.dispose();
  }
}

function filesToList(workspaceRoot: string, files: string[]): string {
  return files.map(f => getRelativePath(workspaceRoot, f)).join('\n');
}
