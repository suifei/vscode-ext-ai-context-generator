/**
 * Recursive file discovery with filtering
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { IgnoreFilter } from './ignoreFilter';
import { Scope } from '../config/constants';
import { getRelativePath } from '../utils/fileUtils';

export interface ScanOptions {
  scope: Scope;
  selectedPaths?: string[];
  includeIgnored?: boolean;
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

    switch (options.scope) {
      case 'workspace':
        return this.scanDirectory(workspaceRoot);
      case 'folder':
        const folderUri = await this.getCurrentFolderUri();
        return folderUri ? this.scanDirectory(folderUri.fsPath) : { files: [], directories: [], skipped: 0 };
      case 'selected':
        return options.selectedPaths?.length
          ? this.scanSelectedPaths(options.selectedPaths)
          : { files: [], directories: [], skipped: 0 };
      default:
        return { files: [], directories: [], skipped: 0 };
    }
  }

  private scanDirectory(dirPath: string, maxDepth = 100): ScanResult {
    const files: string[] = [];
    const directories: string[] = [];
    let skipped = 0;

    if (maxDepth <= 0) return { files, directories, skipped };

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name === IGNORE_FILE_NAME) continue;

        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          if (this.ignoreFilter.isDirectoryIgnored(fullPath)) {
            skipped++;
            continue;
          }

          directories.push(fullPath);
          const subResult = this.scanDirectory(fullPath, maxDepth - 1);
          files.push(...subResult.files);
          directories.push(...subResult.directories);
          skipped += subResult.skipped;
        } else if (entry.isFile()) {
          if (this.ignoreFilter.isIgnored(fullPath)) {
            skipped++;
            continue;
          }

          if (this.isFileReadable(fullPath)) {
            files.push(fullPath);
          } else {
            skipped++;
          }
        }
      }
    } catch (error: unknown) {
      console.warn(`Skipping ${dirPath}:`, error instanceof Error ? error.message : error);
      skipped++;
    }

    return { files, directories, skipped };
  }

  private scanSelectedPaths(selectedPaths: string[]): ScanResult {
    const files: string[] = [];
    const directories: string[] = [];
    let skipped = 0;

    for (const selectedPath of selectedPaths) {
      try {
        const stats = fs.statSync(selectedPath);

        if (stats.isDirectory()) {
          directories.push(selectedPath);
          const result = this.scanDirectory(selectedPath);
          files.push(...result.files);
          directories.push(...result.directories);
          skipped += result.skipped;
        } else if (stats.isFile()) {
          if (this.ignoreFilter.isIgnored(selectedPath)) {
            skipped++;
            continue;
          }

          if (this.isFileReadable(selectedPath)) {
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

  private isFileReadable(filePath: string): boolean {
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  private async getCurrentFolderUri(): Promise<vscode.Uri | undefined> {
    if (vscode.window.activeTextEditor) {
      return vscode.Uri.file(path.dirname(vscode.window.activeTextEditor.document.uri.fsPath));
    }
    return vscode.workspace.workspaceFolders?.[0]?.uri;
  }

  sortFiles(files: string[]): string[] {
    return files.sort((a, b) => a.localeCompare(b));
  }
}

const IGNORE_FILE_NAME = '.aicontextignore';
