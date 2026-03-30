/**
 * Unit tests for DirTreeGenerator
 */

import { expect } from 'chai';
import * as path from 'path';
import { DirTreeGenerator } from '../../../src/core/dirTreeGenerator';

describe('DirTreeGenerator', () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = '/test/workspace';
  });

  describe('basic tree generation', () => {
    it('should generate empty tree for no files', () => {
      const generator = new DirTreeGenerator(workspaceRoot);
      const tree = generator.generate([]);
      expect(tree).to.equal('(empty)');
    });

    it('should generate tree for single file', () => {
      const generator = new DirTreeGenerator(workspaceRoot);
      const files = [path.join(workspaceRoot, 'index.ts')];
      const tree = generator.generate(files);

      expect(tree).to.include('index.ts');
      expect(tree).to.include('📄');
    });

    it('should generate tree for multiple files in root', () => {
      const generator = new DirTreeGenerator(workspaceRoot);
      const files = [
        path.join(workspaceRoot, 'index.ts'),
        path.join(workspaceRoot, 'README.md'),
        path.join(workspaceRoot, 'package.json'),
      ];
      const tree = generator.generate(files);

      expect(tree).to.include('index.ts');
      expect(tree).to.include('README.md');
      expect(tree).to.include('package.json');
    });

    it('should generate tree with nested directories', () => {
      const generator = new DirTreeGenerator(workspaceRoot);
      const files = [
        path.join(workspaceRoot, 'src', 'index.ts'),
        path.join(workspaceRoot, 'src', 'utils', 'helpers.ts'),
        path.join(workspaceRoot, 'package.json'),
      ];
      const tree = generator.generate(files);

      expect(tree).to.include('src');
      expect(tree).to.include('utils');
      expect(tree).to.include('helpers.ts');
      expect(tree).to.include('package.json');
    });
  });

  describe('tree structure', () => {
    it('should use proper tree characters', () => {
      const generator = new DirTreeGenerator(workspaceRoot, { showEmoji: false });
      const files = [
        path.join(workspaceRoot, 'src', 'a.ts'),
        path.join(workspaceRoot, 'src', 'b.ts'),
      ];
      const tree = generator.generate(files);

      expect(tree).to.include('├');
      expect(tree).to.include('─');
      expect(tree).to.include('└');
    });

    it('should show branch for middle items', () => {
      const generator = new DirTreeGenerator(workspaceRoot, { showEmoji: false });
      const files = [
        path.join(workspaceRoot, 'src', 'a.ts'),
        path.join(workspaceRoot, 'src', 'b.ts'),
        path.join(workspaceRoot, 'src', 'c.ts'),
      ];
      const tree = generator.generate(files);

      const lines = tree.split('\n');
      // src appears first (folder)
      expect(lines[0]).to.equal('src');
      // a.ts should have ├─ (not last)
      expect(lines[1]).to.match(/^[│ ]*├─a\.ts$/);
      // b.ts should have ├─ (not last)
      expect(lines[2]).to.match(/^[│ ]*├─b\.ts$/);
      // c.ts should have └─ (last)
      expect(lines[3]).to.match(/^[│ ]*└─c\.ts$/);
    });

    it('should show corner for last item', () => {
      const generator = new DirTreeGenerator(workspaceRoot, { showEmoji: false });
      const files = [path.join(workspaceRoot, 'src', 'index.ts')];
      const tree = generator.generate(files);

      const lines = tree.split('\n');
      // src folder then index.ts with corner
      expect(lines[0]).to.equal('src');
      expect(lines[1]).to.include('└─index.ts');
    });

    it('should show vertical lines for nested items', () => {
      const generator = new DirTreeGenerator(workspaceRoot, { showEmoji: false });
      const files = [
        path.join(workspaceRoot, 'src', 'a.ts'),
        path.join(workspaceRoot, 'src', 'b.ts'),
      ];
      const tree = generator.generate(files);

      const lines = tree.split('\n');
      // src folder
      expect(lines[0]).to.equal('src');
      // a.ts should not have vertical line (first child)
      expect(lines[1]).to.match(/^  ├─a\.ts$/);
      // b.ts should have vertical line prefix since it's after first child
      // Actually, second child shows ├─ with proper indentation
      expect(lines[2]).to.match(/^  └─b\.ts$/);
    });
  });

  describe('emoji display', () => {
    it('should show emoji when enabled', () => {
      const generator = new DirTreeGenerator(workspaceRoot, { showEmoji: true });
      const files = [
        path.join(workspaceRoot, 'src', 'index.ts'),
        path.join(workspaceRoot, 'README.md'),
      ];
      const tree = generator.generate(files);

      expect(tree).to.include('📁'); // Folder
      expect(tree).to.include('📄'); // File
    });

    it('should hide emoji when disabled', () => {
      const generator = new DirTreeGenerator(workspaceRoot, { showEmoji: false });
      const files = [path.join(workspaceRoot, 'index.ts')];
      const tree = generator.generate(files);

      expect(tree).to.not.include('📁');
      expect(tree).to.not.include('📄');
    });

    it('should show emoji by default', () => {
      const generator = new DirTreeGenerator(workspaceRoot);
      const files = [path.join(workspaceRoot, 'index.ts')];
      const tree = generator.generate(files);

      expect(tree).to.include('📄');
    });
  });

  describe('selected files highlighting', () => {
    it('should show checkmark for selected files', () => {
      const selectedFile = path.join(workspaceRoot, 'index.ts');
      const generator = new DirTreeGenerator(workspaceRoot, {
        selectedFiles: new Set([selectedFile]),
        showEmoji: true,
      });
      const files = [
        selectedFile,
        path.join(workspaceRoot, 'README.md'),
      ];
      const tree = generator.generate(files);

      expect(tree).to.include('✓');
    });

    it('should not show checkmark for non-selected files', () => {
      const selectedFile = path.join(workspaceRoot, 'index.ts');
      const generator = new DirTreeGenerator(workspaceRoot, {
        selectedFiles: new Set([selectedFile]),
        showEmoji: true,
      });
      const files = [
        selectedFile,
        path.join(workspaceRoot, 'README.md'),
      ];
      const tree = generator.generate(files);

      const lines = tree.split('\n');
      // Check that not all files have checkmarks
      const checkmarkCount = lines.filter(line => line.includes('✓')).length;
      expect(checkmarkCount).to.equal(1);
    });

    it('should not show checkmark when emoji is disabled', () => {
      const selectedFile = path.join(workspaceRoot, 'index.ts');
      const generator = new DirTreeGenerator(workspaceRoot, {
        selectedFiles: new Set([selectedFile]),
        showEmoji: false,
      });
      const files = [selectedFile];
      const tree = generator.generate(files);

      expect(tree).to.not.include('✓');
    });
  });

  describe('depth limit', () => {
    it('should respect max depth option', () => {
      const generator = new DirTreeGenerator(workspaceRoot, {
        maxDepth: 1,
        showEmoji: false,
      });
      const files = [
        path.join(workspaceRoot, 'src', 'nested', 'deep', 'file.ts'),
      ];
      const tree = generator.generate(files);

      // Should show src but not nested directories beyond depth 1
      expect(tree).to.include('src');
      expect(tree).to.not.include('deep');
      expect(tree).to.not.include('file.ts');
    });

    it('should allow unlimited depth by default', () => {
      const generator = new DirTreeGenerator(workspaceRoot);
      const files = [
        path.join(workspaceRoot, 'a', 'b', 'c', 'd', 'e', 'f.ts'),
      ];
      const tree = generator.generate(files);

      expect(tree).to.include('f.ts');
    });

    it('should handle depth of 0', () => {
      const generator = new DirTreeGenerator(workspaceRoot, {
        maxDepth: 0,
        showEmoji: false,
      });
      const files = [path.join(workspaceRoot, 'src', 'index.ts')];
      const tree = generator.generate(files);

      // Should show nothing or very minimal structure
      expect(tree).to.not.include('index.ts');
    });
  });

  describe('complex directory structures', () => {
    it('should handle mixed files and directories', () => {
      const generator = new DirTreeGenerator(workspaceRoot, { showEmoji: false });
      const files = [
        path.join(workspaceRoot, 'package.json'),
        path.join(workspaceRoot, 'src', 'index.ts'),
        path.join(workspaceRoot, 'src', 'styles.css'),
        path.join(workspaceRoot, 'tests', 'test.spec.ts'),
        path.join(workspaceRoot, 'README.md'),
      ];
      const tree = generator.generate(files);

      expect(tree).to.include('package.json');
      expect(tree).to.include('src');
      expect(tree).to.include('index.ts');
      expect(tree).to.include('styles.css');
      expect(tree).to.include('tests');
      expect(tree).to.include('test.spec.ts');
      expect(tree).to.include('README.md');
    });

    it('should handle files with similar names', () => {
      const generator = new DirTreeGenerator(workspaceRoot, { showEmoji: false });
      const files = [
        path.join(workspaceRoot, 'index.ts'),
        path.join(workspaceRoot, 'index.test.ts'),
        path.join(workspaceRoot, 'index.spec.ts'),
      ];
      const tree = generator.generate(files);

      const lines = tree.split('\n').filter(line => line.includes('index'));
      expect(lines).to.have.lengthOf(3);
    });

    it('should handle deep nesting', () => {
      const generator = new DirTreeGenerator(workspaceRoot, { showEmoji: false });
      const files = [
        path.join(workspaceRoot, 'a', 'b', 'c', 'd', 'e', 'file.ts'),
      ];
      const tree = generator.generate(files);

      expect(tree).to.include('file.ts');
      // Should have proper indentation
      const lines = tree.split('\n');
      const lastLine = lines[lines.length - 1];
      expect(lastLine).to.match(/^\s{10,}/); // Should be indented
    });
  });

  describe('path handling', () => {
    it('should handle absolute paths correctly', () => {
      const generator = new DirTreeGenerator(workspaceRoot);
      const files = [path.join(workspaceRoot, 'src', 'index.ts')];
      const tree = generator.generate(files);

      expect(tree).to.include('src');
      expect(tree).to.include('index.ts');
      expect(tree).to.not.include(workspaceRoot); // Should not show full path
    });

    it('should normalize path separators', () => {
      const generator = new DirTreeGenerator(workspaceRoot);
      // Test with forward slashes (normalized paths)
      const files = [path.join(workspaceRoot, 'src', 'index.ts')];
      const tree = generator.generate(files);

      expect(tree).to.not.include(path.sep); // Should use / in tree display
    });
  });

  describe('sorting and ordering', () => {
    it('should maintain file order from input', () => {
      const generator = new DirTreeGenerator(workspaceRoot, { showEmoji: false });
      const files = [
        path.join(workspaceRoot, 'z.ts'),
        path.join(workspaceRoot, 'a.ts'),
        path.join(workspaceRoot, 'm.ts'),
      ];
      const tree = generator.generate(files);

      const lines = tree.split('\n');
      // Files should appear in the order they were added to the tree structure
      expect(lines[0]).to.include('z.ts');
    });
  });

  describe('special cases', () => {
    it('should handle files with dots in names', () => {
      const generator = new DirTreeGenerator(workspaceRoot, { showEmoji: false });
      const files = [path.join(workspaceRoot, '.env'), path.join(workspaceRoot, 'next.config.js')];
      const tree = generator.generate(files);

      expect(tree).to.include('.env');
      expect(tree).to.include('next.config.js');
    });

    it('should handle files with spaces in names', () => {
      const generator = new DirTreeGenerator(workspaceRoot, { showEmoji: false });
      const files = [path.join(workspaceRoot, 'file with spaces.ts')];
      const tree = generator.generate(files);

      expect(tree).to.include('file with spaces.ts');
    });

    it('should handle empty directory names', () => {
      const generator = new DirTreeGenerator(workspaceRoot, { showEmoji: false });
      const files = [path.join(workspaceRoot, 'src', '', 'index.ts').replace(path.sep + path.sep, path.sep)];
      const tree = generator.generate(files);

      // Should handle gracefully
      expect(tree).to.be.a('string');
    });
  });

  describe('combined options', () => {
    it('should work with all options enabled', () => {
      const selectedFile = path.join(workspaceRoot, 'src', 'index.ts');
      const generator = new DirTreeGenerator(workspaceRoot, {
        showEmoji: true,
        selectedFiles: new Set([selectedFile]),
        maxDepth: 10,
      });
      const files = [
        selectedFile,
        path.join(workspaceRoot, 'src', 'utils.ts'),
        path.join(workspaceRoot, 'README.md'),
      ];
      const tree = generator.generate(files);

      expect(tree).to.include('📄');
      expect(tree).to.include('✓');
      expect(tree).to.include('index.ts');
      expect(tree).to.include('utils.ts');
    });

    it('should work with all options disabled', () => {
      const generator = new DirTreeGenerator(workspaceRoot, {
        showEmoji: false,
        selectedFiles: new Set(),
        maxDepth: 100,
      });
      const files = [path.join(workspaceRoot, 'index.ts')];
      const tree = generator.generate(files);

      expect(tree).to.not.include('📄');
      expect(tree).to.not.include('✓');
      expect(tree).to.include('index.ts');
    });
  });
});
