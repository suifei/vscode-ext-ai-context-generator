/**
 * File content router with size threshold handling
 */

import * as fs from 'fs';
import * as path from 'path';
import { getLanguageFromPath } from '../utils/languageMapper';
import { formatFileSize, getRelativePath } from '../utils/fileUtils';
import { AIContextConfig, BINARY_EMOJI, WARNING_EMOJI } from '../config/constants';

export interface FileReadResult {
  path: string;
  content: string;
  size: number;
  language?: string;
  isBinary: boolean;
  isTruncated: boolean;
  metadata?: BinaryMetadata;
}

export interface BinaryMetadata {
  type: string;
  format?: string;
  description: string;
}

export class FileReader {
  private config: AIContextConfig;
  private workspaceRoot: string;

  constructor(config: AIContextConfig, workspaceRoot: string) {
    this.config = config;
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Read a single file
   */
  readFile(filePath: string): FileReadResult {
    const stats = fs.statSync(filePath);
    const size = stats.size;
    const exceedsThreshold = size > this.config.maxFileSize;
    const isBinary = this.isBinaryFile(filePath);

    if (isBinary) {
      return {
        path: filePath,
        content: '',
        size,
        isBinary: true,
        isTruncated: false,
        metadata: this.extractBinaryMetadata(filePath),
      };
    }

    const content = this.readFileContent(filePath);

    return {
      path: filePath,
      content,
      size,
      language: getLanguageFromPath(filePath),
      isBinary: false,
      isTruncated: exceedsThreshold,
    };
  }

  /**
   * Read multiple files in parallel
   */
  async readFiles(filePaths: string[]): Promise<FileReadResult[]> {
    const concurrency = this.config.parallelFileReads;
    const results: FileReadResult[] = [];

    for (let i = 0; i < filePaths.length; i += concurrency) {
      const batch = filePaths.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(filePath => this.safeReadFile(filePath))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Safely read a file with error handling
   */
  private async safeReadFile(filePath: string): Promise<FileReadResult> {
    try {
      return this.readFile(filePath);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Error reading file ${filePath}: ${message}`);
      return {
        path: filePath,
        content: `// Error reading file: ${message}`,
        size: 0,
        isBinary: false,
        isTruncated: false,
      };
    }
  }

  /**
   * Read file content
   */
  private readFileContent(filePath: string): string {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read file: ${message}`);
    }
  }

  /**
   * Check if a file is binary
   */
  private isBinaryFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();

    for (const pattern of this.config.binaryFilePatterns) {
      if (pattern === '*.' + ext || pattern === ext) {
        return true;
      }
    }

    // Check content for unknown extensions
    if (!ext) {
      return this.checkContentIsBinary(filePath);
    }

    return false;
  }

  /**
   * Check file content for binary indicators
   */
  private checkContentIsBinary(filePath: string): boolean {
    try {
      const fd = fs.openSync(filePath, 'r');
      try {
        const buffer = Buffer.alloc(1024);
        fs.readSync(fd, buffer, 0, 1024, 0);
        return buffer.includes(0);
      } finally {
        fs.closeSync(fd);
      }
    } catch {
      return true;
    }
  }

  /**
   * Extract metadata from binary files
   */
  private extractBinaryMetadata(filePath: string): BinaryMetadata {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath);

    const types: Record<string, string> = {
      '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.gif': 'image',
      '.webp': 'image', '.bmp': 'image', '.ico': 'image', '.svg': 'image',
      '.mp3': 'audio', '.wav': 'audio', '.ogg': 'audio', '.flac': 'audio', '.aac': 'audio',
      '.mp4': 'video', '.avi': 'video', '.mov': 'video', '.mkv': 'video', '.webm': 'video',
      '.zip': 'archive', '.tar': 'archive', '.gz': 'archive', '.rar': 'archive', '.7z': 'archive',
      '.ttf': 'font', '.otf': 'font', '.woff': 'font', '.woff2': 'font', '.eot': 'font',
    };

    const type = types[ext] || 'binary';

    return {
      type,
      format: ext.substring(1).toUpperCase(),
      description: `${BINARY_EMOJI} ${type} file: ${basename}`,
    };
  }

  /**
   * Format file content for output
   */
  formatFileContent(result: FileReadResult): string {
    const relativePath = getRelativePath(this.workspaceRoot, result.path);
    const language = result.language || 'text';

    if (result.isBinary && result.metadata) {
      return `// ${result.metadata.description}\n// Type: ${result.metadata.type}\n`;
    }

    let output = `// File: ${relativePath}`;
    if (result.isTruncated) {
      output += ` (${WARNING_EMOJI} ${formatFileSize(result.size)}, exceeds ${formatFileSize(this.config.maxFileSize)} threshold)\n`;
    } else {
      output += ` (${formatFileSize(result.size)})\n`;
    }

    output += `\`\`\`${language}\n${result.content}\n\`\`\n`;

    return output;
  }
}
