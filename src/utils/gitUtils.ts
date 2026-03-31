/**
 * Git-related utility functions
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Read and parse .gitignore file
 * Returns an array of non-comment, non-empty patterns
 */
export function readGitignore(workspaceRoot: string): string[] {
  const gitignorePath = path.join(workspaceRoot, '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    const lines = content.split('\n');

    // Filter out comments and empty lines
    return lines
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));
  } catch {
    return [];
  }
}
