/**
 * Main orchestration - coordinates scanning, reading, and rendering
 */

import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { IgnoreFilter } from './ignoreFilter';
import { FileScanner } from './fileScanner';
import { DirTreeGenerator } from './dirTreeGenerator';
import { FileReader, FileReadResult } from './fileReader';
import { TokenCounter } from './tokenCounter';
import { TemplateRenderer, TemplateVariables } from './templateRenderer';
import { SmartSummarizer } from './smartSummarizer';
import { Logger } from './logger';
import { AIContextConfig, DEFAULT_CONFIG, OutputTarget, WARNING_EMOJI } from '../config/constants';
import { getRelativePath, formatFileSize } from '../utils/fileUtils';
import { OutlineExtractorRegistry, OutlineOptions } from '../outline/registry';

export interface GenerationOptions {
  /**
   * Paths to include in the context.
   * If empty, the entire workspace is scanned.
   */
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

    this.ignoreFilter = new IgnoreFilter(workspaceRoot, this.config.ignorePatterns, this.config.binaryFilePatterns);
    this.fileScanner = new FileScanner(this.ignoreFilter);
    this.fileReader = new FileReader(this.config, workspaceRoot);
    this.tokenCounter = new TokenCounter(this.config.tokenEstimation);
    this.templateRenderer = new TemplateRenderer(workspaceRoot);
    this.smartSummarizer = new SmartSummarizer(this.config, workspaceRoot);
  }

  /** Get all config keys for dynamic loading */
  private static readonly CONFIG_KEYS = Object.keys(DEFAULT_CONFIG) as Array<keyof AIContextConfig>;

  async generate(options: GenerationOptions): Promise<GenerationResult> {
    Logger.logScanStart(options.selectedPaths?.length ? 'selected' : 'workspace');
    Logger.debug('Generation options:', options);

    // Step 1: Scan for files
    Logger.debug('Step 1: Scanning files...');
    const scanResult = await this.fileScanner.scan({
      paths: options.selectedPaths,
    });

    const files = this.fileScanner.sortFiles(scanResult.files);
    Logger.debug(`Scan complete: ${files.length} files found (${scanResult.skipped} skipped)`);

    if (files.length === 0) {
      Logger.warn('No files found after scanning');
      return this.emptyResult();
    }

    // Step 2: Determine tree root (common parent of selected files)
    const treeRoot = options.selectedPaths
      ? this.findCommonParent(options.selectedPaths)
      : this.workspaceRoot;

    // Step 3: Read file contents
    Logger.debug('Step 3: Reading file contents...');
    const fileResults = await this.fileReader.readFiles(files);
    Logger.debug(`File reading complete: ${fileResults.length} files processed`);

    // Step 4: Generate directory tree
    Logger.debug('Step 4: Generating directory tree...');
    const dirTree = new DirTreeGenerator(treeRoot, {
      showEmoji: this.config.showTreeEmoji,
      selectedFiles: new Set(files),
    }).generate(files);

    // Step 5: Process files (summaries/outlines)
    Logger.debug('Step 5: Processing files (summaries/outlines)...');
    const { contents, outlineCount } = await this.processFiles(fileResults);
    const fileContents = contents.join('\n\n');

    // Step 6: Calculate tokens
    Logger.debug('Step 6: Calculating tokens...');
    const tempContent = this.buildTemporaryContent(dirTree, fileContents);
    const tokenCount = this.tokenCounter.count(tempContent);
    Logger.debug(`Token count: ${tokenCount} (limit: ${this.config.maxTokens})`);

    // Step 7: Render template
    Logger.debug('Step 7: Rendering template...');
    const content = this.renderTemplate(options.templateName, {
      dirTree,
      fileContents,
      files,
      tokenCount,
      outlineCount,
      selectedPaths: options.selectedPaths,
      treeRoot,
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

  private async processFiles(fileResults: FileReadResult[]): Promise<{ contents: string[]; outlineCount: number }> {
    const contents: string[] = [];
    let outlineCount = 0;

    for (const result of fileResults) {
      if (result.isBinary) {
        contents.push(this.fileReader.formatFileContent(result));
        continue;
      }

      // Check if file should use outline extraction
      if (this.shouldUseOutlineExtractor(result)) {
        const outline = await this.extractOutline(result);
        contents.push(outline);
        outlineCount++;
        continue;
      }

      // Use smart summarizer for supported file types
      if (result.isTruncated || this.smartSummarizer.shouldSummarize(result.path)) {
        contents.push(await this.smartSummarizer.summarize(result));
      } else {
        contents.push(this.fileReader.formatFileContent(result));
      }
    }

    return { contents, outlineCount };
  }

  /**
   * Check if a file should use outline extraction
   */
  private shouldUseOutlineExtractor(result: FileReadResult): boolean {
    // Only use outline for large files (isTruncated)
    if (!result.isTruncated) return false;

    // Check if language supports outline extraction
    return OutlineExtractorRegistry.hasASTSupport(result.language || '');
  }

  /**
   * Extract outline from a document using OutlineExtractor
   */
  private async extractOutline(result: FileReadResult): Promise<string> {
    const uri = vscode.Uri.file(result.path);
    const document = await vscode.workspace.openTextDocument(uri);

    try {
      const options: OutlineOptions = {
        detail: this.config.outlineDetail,
        includePrivate: this.config.outlineIncludePrivate,
        extractComments: this.config.outlineExtractComments,
        maxItems: this.config.outlineMaxItems,
      };

      const outline = await OutlineExtractorRegistry.extractOutline(document, options);
      const relativePath = getRelativePath(this.workspaceRoot, result.path);
      const fileSize = formatFileSize(result.size);
      const warning = `${WARNING_EMOJI} Overview — ${fileSize}, structure outline`;
      return `// File: ${relativePath} (${warning})\n// Language: ${result.language}\n\n${outline}`;
    } catch (error) {
      // Fallback to smart summarizer on error
      Logger.warn(`Outline extraction failed for ${result.path}, falling back to smart summarizer:`, error);
      return await this.smartSummarizer.summarize(result);
    }
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
      treeRoot: string;
    }
  ): string {
    const template = this.templateRenderer.loadTemplate(
      templateName || this.config.defaultTemplate
    );

    const vars: TemplateVariables = {
      PROJECT_NAME: path.basename(data.treeRoot),
      DIR_TREE: data.dirTree,
      FILE_LIST: data.files.map(f => getRelativePath(data.treeRoot, f)).join('\n'),
      FILE_CONTENTS: data.fileContents,
      TOKEN_COUNT: this.tokenCounter.formatTokenCount(data.tokenCount),
      TOKEN_LIMIT: this.tokenCounter.formatTokenCount(this.config.maxTokens),
      FILE_COUNT: data.files.length.toString(),
      OUTLINE_COUNT: data.outlineCount.toString(),
      TIMESTAMP: new Date().toISOString(),
      SELECTED_FILES: data.selectedPaths
        ? data.selectedPaths.map(p => getRelativePath(data.treeRoot, p)).join(', ')
        : '',
      SCOPE: data.selectedPaths?.length ? 'selected' : 'workspace',
      WORKSPACE_PATH: this.workspaceRoot,
    };

    return this.templateRenderer.render(template, vars);
  }

  /**
   * Find common parent directory of selected paths
   * Returns the workspace root if paths span multiple top-level directories
   */
  private findCommonParent(selectedPaths: string[]): string {
    if (selectedPaths.length === 0) return this.workspaceRoot;
    if (selectedPaths.length === 1) {
      const p = selectedPaths[0];
      try {
        const stats = fs.statSync(p);
        return stats.isDirectory() ? p : path.dirname(p);
      } catch {
        return path.dirname(p);
      }
    }

    // Find common prefix
    const parts = selectedPaths.map(p => p.split(path.sep));
    let commonLength = 0;

    const minParts = Math.min(...parts.map(p => p.length));
    for (let i = 0; i < minParts; i++) {
      const current = parts[0][i];
      if (parts.every(p => p[i] === current)) {
        commonLength = i + 1;
      } else {
        break;
      }
    }

    // If no common parts, use workspace root
    if (commonLength === 0) return this.workspaceRoot;

    const commonParent = parts[0].slice(0, commonLength).join(path.sep);

    // Ensure common parent is within workspace
    if (commonParent.startsWith(this.workspaceRoot)) {
      return commonParent;
    }

    return this.workspaceRoot;
  }

  updateConfig(config: Partial<AIContextConfig>): void {
    this.config = { ...this.config, ...config };
    this.ignoreFilter.reload(this.config.ignorePatterns, this.config.binaryFilePatterns);
    this.refreshDependents();
  }

  reloadFromSettings(): void {
    const vscodeConfig = vscode.workspace.getConfiguration('aiContext');
    const config = this.loadConfigFromSettings(vscodeConfig);
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ignoreFilter.reload(this.config.ignorePatterns, this.config.binaryFilePatterns);
    this.refreshDependents();
  }

  /**
   * Refresh components that depend on config
   */
  private refreshDependents(): void {
    this.fileReader = new FileReader(this.config, this.workspaceRoot);
    this.smartSummarizer = new SmartSummarizer(this.config, this.workspaceRoot);
    this.tokenCounter = new TokenCounter(this.config.tokenEstimation);
  }

  private loadConfigFromSettings(vscodeConfig: vscode.WorkspaceConfiguration): Partial<AIContextConfig> {
    const result: Partial<AIContextConfig> = {};

    for (const key of ContextGenerator.CONFIG_KEYS) {
      const defaultValue = DEFAULT_CONFIG[key];
      const value = vscodeConfig.get(key, defaultValue);
      result[key] = value as never;
    }

    return result;
  }

  getAvailableTemplates(): string[] {
    return this.templateRenderer.getAvailableTemplates();
  }

  getMaxTokens(): number {
    return this.config.maxTokens;
  }

  dispose(): void {
    Logger.debug('ContextGenerator disposed');
  }
}

