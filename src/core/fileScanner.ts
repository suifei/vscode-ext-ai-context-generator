/**
 * Recursive file discovery with filtering
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { IgnoreFilter } from './ignoreFilter';
import { Logger } from './logger';
import { IGNORE_FILE_NAME } from '../config/constants';

export interface ScanOptions {
  /**
   * Paths to scan. If provided, scans only these paths.
   * If empty, scans the entire workspace.
   */
  paths?: string[];
}

export interface ScanResult {
  files: string[];
  directories: string[];
  skipped: number;
}

export class FileScanner {
  constructor(private readonly ignoreFilter: IgnoreFilter) {}

  async scan(options: ScanOptions): Promise<ScanResult> {
    const workspaceRoot = this.ignoreFilter.getWorkspaceRoot();

    // If specific paths provided, scan only those
    if (options.paths?.length) {
      return this.scanSelectedPaths(options.paths);
    }

    // Otherwise, scan entire workspace
    return this.scanDirectoryAsync(workspaceRoot);
  }

  private async scanDirectoryAsync(dirPath: string, maxDepth = 100): Promise<ScanResult> {
    const files: string[] = [];
    const directories: string[] = [];
    let skipped = 0;

    if (maxDepth <= 0) return { files, directories, skipped };

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name === IGNORE_FILE_NAME) continue;

        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          if (this.ignoreFilter.isDirectoryIgnored(fullPath)) {
            skipped++;
            continue;
          }

          directories.push(fullPath);
          const subResult = await this.scanDirectoryAsync(fullPath, maxDepth - 1);
          files.push(...subResult.files);
          directories.push(...subResult.directories);
          skipped += subResult.skipped;
        } else if (entry.isFile()) {
          if (this.ignoreFilter.isIgnored(fullPath)) {
            skipped++;
            continue;
          }

          if (await this.isFileReadable(fullPath)) {
            files.push(fullPath);
          } else {
            skipped++;
          }
        }
      }
    } catch (error: unknown) {
      Logger.warn(`Skipping ${dirPath}:`, error instanceof Error ? error.message : error);
      skipped++;
    }

    return { files, directories, skipped };
  }

  private async scanSelectedPaths(selectedPaths: string[]): Promise<ScanResult> {
    const files: string[] = [];
    const directories: string[] = [];
    let skipped = 0;

    for (const selectedPath of selectedPaths) {
      try {
        const stats = await fs.stat(selectedPath);

        if (stats.isDirectory()) {
          directories.push(selectedPath);
          const result = await this.scanDirectoryAsync(selectedPath);
          files.push(...result.files);
          directories.push(...result.directories);
          skipped += result.skipped;
        } else if (stats.isFile()) {
          if (this.ignoreFilter.isIgnored(selectedPath)) {
            skipped++;
            continue;
          }

          if (await this.isFileReadable(selectedPath)) {
            files.push(selectedPath);
          } else {
            skipped++;
          }
        }
      } catch {
        skipped++;
      }
    }

    return { files, directories, skipped };
  }

  private async isFileReadable(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  sortFiles(files: string[]): string[] {
    return files.sort((a, b) => a.localeCompare(b));
  }
}
