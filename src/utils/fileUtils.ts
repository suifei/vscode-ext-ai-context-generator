/**
 * Shared file utility functions
 */

import * as path from 'path';

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  return `${bytes}B`;
}

/**
 * Get relative path from workspace root
 */
export function getRelativePath(workspaceRoot: string, filePath: string): string {
  return path.relative(workspaceRoot, filePath);
}

/**
 * Check if a file is a code file based on extension
 */
export function isCodeFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const codeExtensions = new Set([
    '.ts', '.tsx', '.js', '.jsx',
    '.py', '.go', '.rs', '.java', '.kt', '.scala',
    '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.rb',
    '.swift', '.sh', '.bash', '.sql',
  ]);
  return codeExtensions.has(ext);
}

/**
 * Normalize path separators to forward slashes (for .gitignore compatibility)
 */
export function normalizePathSeparators(filePath: string): string {
  return filePath.split(path.sep).join('/');
}
