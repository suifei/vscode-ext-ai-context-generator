/**
 * File filtering using .gitignore syntax
 */

import * as fs from 'fs';
import * as path from 'path';
import Ignore from 'ignore';
import { IGNORE_FILE_NAME } from '../config/constants';
import { readGitignore } from '../utils/gitUtils';
import { normalizePathSeparators } from '../utils/fileUtils';

export class IgnoreFilter {
  private ignoreInstance: ReturnType<typeof Ignore>;
  private readonly workspaceRoot: string;
  private readonly binaryPatterns: string[];

  constructor(workspaceRoot: string, additionalPatterns: string[] = [], binaryPatterns: string[] = []) {
    this.workspaceRoot = workspaceRoot;
    this.binaryPatterns = binaryPatterns;
    this.ignoreInstance = Ignore();
    this.loadPatterns(additionalPatterns);
  }

  private loadPatterns(additionalPatterns: string[]): void {
    // Create a fresh ignore instance to clear previous patterns
    this.ignoreInstance = Ignore();

    // First, add .gitignore patterns if available
    const gitignorePatterns = readGitignore(this.workspaceRoot);
    if (gitignorePatterns.length > 0) {
      this.ignoreInstance = this.ignoreInstance.add(gitignorePatterns);
    }

    const ignoreFilePath = path.join(this.workspaceRoot, IGNORE_FILE_NAME);

    if (fs.existsSync(ignoreFilePath)) {
      try {
        const content = fs.readFileSync(ignoreFilePath, 'utf-8');
        this.ignoreInstance = this.ignoreInstance.add(content);
      } catch {
        // Keep the current instance
      }
    }

    this.ignoreInstance = this.ignoreInstance.add(additionalPatterns);
    this.ignoreInstance = this.ignoreInstance.add(this.binaryPatterns);
  }

  reload(additionalPatterns: string[] = [], binaryPatterns?: string[]): void {
    if (binaryPatterns) {
      this.binaryPatterns.length = 0;
      this.binaryPatterns.push(...binaryPatterns);
    }
    this.loadPatterns(additionalPatterns);
  }

  isIgnored(filePath: string): boolean {
    const normalizedPath = this.toNormalizedPath(filePath);
    return this.ignoreInstance.ignores(normalizedPath);
  }

  isDirectoryIgnored(dirPath: string): boolean {
    const normalizedPath = this.toNormalizedPath(dirPath);
    return this.ignoreInstance.ignores(normalizedPath) ||
           this.ignoreInstance.ignores(normalizedPath + '/');
  }

  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  /**
   * Convert file path to normalized format for ignore library
   */
  private toNormalizedPath(filePath: string): string {
    const relativePath = path.relative(this.workspaceRoot, filePath);
    return normalizePathSeparators(relativePath);
  }
}
