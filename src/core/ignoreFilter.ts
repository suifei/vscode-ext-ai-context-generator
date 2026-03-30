/**
 * File filtering using .gitignore syntax
 */

import * as fs from 'fs';
import * as path from 'path';
import Ignore from 'ignore';
import { DEFAULT_CONFIG, IGNORE_FILE_NAME } from '../config/constants';

export class IgnoreFilter {
  private ignoreInstance: ReturnType<typeof Ignore>;
  private readonly workspaceRoot: string;

  constructor(workspaceRoot: string, additionalPatterns: string[] = []) {
    this.workspaceRoot = workspaceRoot;
    this.ignoreInstance = Ignore();
    this.loadPatterns(additionalPatterns);
  }

  private loadPatterns(additionalPatterns: string[]): void {
    // Create a fresh ignore instance to clear previous patterns
    this.ignoreInstance = Ignore();

    const ignoreFilePath = path.join(this.workspaceRoot, IGNORE_FILE_NAME);

    if (fs.existsSync(ignoreFilePath)) {
      try {
        const content = fs.readFileSync(ignoreFilePath, 'utf-8');
        this.ignoreInstance = this.ignoreInstance.add(content);
      } catch {
        // Keep the fresh instance
      }
    }

    this.ignoreInstance = this.ignoreInstance.add(additionalPatterns);
    this.ignoreInstance = this.ignoreInstance.add(DEFAULT_CONFIG.binaryFilePatterns);
  }

  reload(additionalPatterns: string[] = []): void {
    this.loadPatterns(additionalPatterns);
  }

  isIgnored(filePath: string): boolean {
    const relativePath = path.relative(this.workspaceRoot, filePath);
    const normalizedPath = relativePath.split(path.sep).join('/');
    return this.ignoreInstance.ignores(normalizedPath);
  }

  isDirectoryIgnored(dirPath: string): boolean {
    const relativePath = path.relative(this.workspaceRoot, dirPath);
    const normalizedPath = relativePath.split(path.sep).join('/');
    return this.ignoreInstance.ignores(normalizedPath) ||
           this.ignoreInstance.ignores(normalizedPath + '/');
  }

  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }
}
