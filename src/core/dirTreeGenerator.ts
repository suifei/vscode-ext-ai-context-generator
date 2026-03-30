/**
 * ASCII directory tree generation with emoji highlighting
 */

import * as path from 'path';
import { TREE_CHARS, FILE_EMOJI, FOLDER_EMOJI } from '../config/constants';
import { getRelativePath } from '../utils/fileUtils';

export interface TreeOptions {
  showEmoji?: boolean;
  selectedFiles?: Set<string>;
  maxDepth?: number;
}

export class DirTreeGenerator {
  private readonly workspaceRoot: string;
  private readonly options: Required<TreeOptions>;

  constructor(workspaceRoot: string, options: TreeOptions = {}) {
    this.workspaceRoot = workspaceRoot;
    this.options = {
      showEmoji: options.showEmoji ?? true,
      selectedFiles: options.selectedFiles ?? new Set<string>(),
      maxDepth: options.maxDepth ?? 100,
    };
  }

  generate(files: string[]): string {
    if (files.length === 0) return '(empty)';

    const root = this.buildTree(files);
    return this.renderTree(root);
  }

  private buildTree(files: string[]): TreeNode {
    const root: TreeNode = {
      name: '',
      path: this.workspaceRoot,
      children: {},
      isDirectory: true,
    };

    for (const file of files) {
      const relativePath = getRelativePath(this.workspaceRoot, file);
      const parts = relativePath.split(path.sep);

      let currentNode = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLastPart = i === parts.length - 1;
        const fullPath = path.join(this.workspaceRoot, ...parts.slice(0, i + 1));

        if (!currentNode.children[part]) {
          currentNode.children[part] = {
            name: part,
            path: fullPath,
            children: {},
            isDirectory: !isLastPart,
            isFile: isLastPart,
          };
        }

        if (!isLastPart) {
          currentNode = currentNode.children[part];
        }
      }
    }

    return root;
  }

  private renderTree(root: TreeNode): string {
    const lines: string[] = [];
    this.renderNode(root, '', true, lines, 0);
    return lines.join('\n');
  }

  private renderNode(
    node: TreeNode,
    prefix: string,
    isLast: boolean,
    lines: string[],
    depth: number
  ): void {
    if (node.name === '') {
      const entries = Object.entries(node.children);
      entries.forEach(([_, child], index) => {
        this.renderNode(child, prefix, index === entries.length - 1, lines, depth);
      });
      return;
    }

    if (depth >= this.options.maxDepth) return;

    const isSelected = this.options.selectedFiles.has(node.path);
    let line = prefix;
    if (prefix) {
      line += (isLast ? TREE_CHARS.corner : TREE_CHARS.branch) + TREE_CHARS.horizontal;
    }

    if (this.options.showEmoji) {
      line += node.isDirectory ? FOLDER_EMOJI + ' ' : FILE_EMOJI + ' ';
    }

    line += node.name;
    if (isSelected && this.options.showEmoji) line += ' ✓';

    lines.push(line);

    if (node.isDirectory && Object.keys(node.children).length > 0) {
      const entries = Object.entries(node.children);
      const newPrefix = prefix + (isLast ? ' ' : TREE_CHARS.vertical) + ' ';
      entries.forEach(([_, child], index) => {
        this.renderNode(child, newPrefix, index === entries.length - 1, lines, depth + 1);
      });
    }
  }
}

interface TreeNode {
  name: string;
  path: string;
  children: Record<string, TreeNode>;
  isDirectory: boolean;
  isFile?: boolean;
}
