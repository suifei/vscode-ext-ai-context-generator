/**
 * File content router with size threshold handling
 */

import * as fs from 'fs';
import * as path from 'path';
import { getLanguageFromPath } from '../utils/languageMapper';
import { formatFileSize, getRelativePath } from '../utils/fileUtils';
import { getErrorMessage } from '../utils/errorUtils';
import { Logger } from './logger';
import { BinaryMetadataExtractor } from './binaryMetadataExtractor';
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
  // 增强元数据字段
  fileSize?: number;      // 文件大小（字节）
  dimensions?: string;     // 图像尺寸 "1920x1080" 或视频
  duration?: string;       // 音频/视频时长 "3:45" 或秒数
  bitrate?: string;        // 比特率 "320kbps"
  sampleRate?: string;     // 采样率 "44.1kHz"
  channels?: number;       // 声道数
  mime?: string;           // MIME 类型
  hasAlpha?: boolean;      // 是否有透明通道（图片）
  colorDepth?: string;     // 颜色深度 "8-bit", "24-bit", "32-bit"
  compression?: string;    // 压缩格式（用于压缩包）
  entryCount?: number;     // 文件数量（用于压缩包）
}

export class FileReader {
  private config: AIContextConfig;
  private workspaceRoot: string;
  private readonly metadataExtractor: BinaryMetadataExtractor;

  constructor(config: AIContextConfig, workspaceRoot: string) {
    this.config = config;
    this.workspaceRoot = workspaceRoot;
    this.metadataExtractor = new BinaryMetadataExtractor(workspaceRoot);
  }

  /**
   * Read a single file
   */
  readFile(filePath: string): FileReadResult {
    const stats = fs.statSync(filePath);
    const size = stats.size;
    const exceedsThreshold = size > this.config.maxFileSize;
    const isBinary = this.isBinaryFile(filePath);

    // Only set isTruncated if large file degradation is enabled
    const shouldTruncate = exceedsThreshold && this.config.enableLargeFileDegradation;

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
      isTruncated: shouldTruncate,
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
      const message = getErrorMessage(error);
      Logger.warn(`Error reading file ${filePath}: ${message}`);
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
      throw new Error(`Failed to read file: ${getErrorMessage(error)}`);
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
    return this.metadataExtractor.extract(filePath);
  }

  /**
   * Format file content for output
   */
  formatFileContent(result: FileReadResult): string {
    const relativePath = getRelativePath(this.workspaceRoot, result.path);
    const language = result.language || 'text';

    if (result.isBinary && result.metadata) {
      return this.formatBinaryMetadata(relativePath, result.metadata);
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

  /**
   * Format binary metadata for output
   */
  private formatBinaryMetadata(relativePath: string, meta: BinaryMetadata): string {
    let output = `// ${meta.description}\n`;
    output += `// Type: ${meta.type}`;

    if (meta.format) {
      output += ` (${meta.format})`;
    }

    // Build details array
    const details: string[] = [];
    if (meta.dimensions) details.push(`Size: ${meta.dimensions}`);
    if (meta.duration) details.push(`Duration: ${meta.duration}`);
    if (meta.bitrate) details.push(`Bitrate: ${meta.bitrate}`);
    if (meta.sampleRate) details.push(`Sample Rate: ${meta.sampleRate}`);
    if (meta.channels !== undefined) details.push(`Channels: ${meta.channels}`);
    if (meta.colorDepth) details.push(`Depth: ${meta.colorDepth}`);
    if (meta.hasAlpha !== undefined) details.push(`Alpha: ${meta.hasAlpha ? 'Yes' : 'No'}`);
    if (meta.compression) details.push(`Compression: ${meta.compression}`);
    if (meta.entryCount !== undefined) details.push(`Entries: ${meta.entryCount}`);
    if (meta.mime) details.push(`MIME: ${meta.mime}`);

    if (details.length > 0) {
      output += `\n// Details: ${details.join(', ')}`;
    }

    output += '\n';
    return output;
  }
}
