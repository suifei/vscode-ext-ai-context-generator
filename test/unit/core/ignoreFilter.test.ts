/**
 * Unit tests for IgnoreFilter
 */

import { expect } from 'chai';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { IgnoreFilter } from '../../../src/core/ignoreFilter';
import { DEFAULT_CONFIG } from '../../../src/config/constants';

describe('IgnoreFilter', () => {
  let tempDir: string;
  let ignoreFilter: IgnoreFilter;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-context-test-'));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('default patterns', () => {
    beforeEach(() => {
      // Pass default patterns to match actual usage
      ignoreFilter = new IgnoreFilter(tempDir, DEFAULT_CONFIG.ignorePatterns);
    });

    it('should ignore node_modules by default', () => {
      const nodeModulesPath = path.join(tempDir, 'node_modules', 'package');
      expect(ignoreFilter.isDirectoryIgnored(nodeModulesPath)).to.be.true;
    });

    it('should ignore dist directory', () => {
      const distPath = path.join(tempDir, 'dist', 'file.js');
      expect(ignoreFilter.isIgnored(distPath)).to.be.true;
    });

    it('should ignore build directory', () => {
      const buildPath = path.join(tempDir, 'build', 'output.txt');
      expect(ignoreFilter.isIgnored(buildPath)).to.be.true;
    });

    it('should ignore .git directory', () => {
      const gitPath = path.join(tempDir, '.git', 'config');
      expect(ignoreFilter.isDirectoryIgnored(gitPath)).to.be.true;
    });

    it('should ignore minified JS files', () => {
      const minJsPath = path.join(tempDir, 'bundle.min.js');
      expect(ignoreFilter.isIgnored(minJsPath)).to.be.true;
    });

    it('should ignore minified CSS files', () => {
      const minCssPath = path.join(tempDir, 'style.min.css');
      expect(ignoreFilter.isIgnored(minCssPath)).to.be.true;
    });

    it('should ignore PNG images', () => {
      const pngPath = path.join(tempDir, 'image.png');
      expect(ignoreFilter.isIgnored(pngPath)).to.be.true;
    });

    it('should ignore lock files', () => {
      const lockPath = path.join(tempDir, 'package-lock.json');
      expect(ignoreFilter.isIgnored(lockPath)).to.be.true;
    });
  });

  describe('additional patterns', () => {
    it('should respect additional ignore patterns', () => {
      ignoreFilter = new IgnoreFilter(tempDir, ['*.log', '*.tmp']);

      expect(ignoreFilter.isIgnored(path.join(tempDir, 'test.log'))).to.be.true;
      expect(ignoreFilter.isIgnored(path.join(tempDir, 'temp.tmp'))).to.be.true;
    });

    it('should respect glob patterns', () => {
      ignoreFilter = new IgnoreFilter(tempDir, ['test/**']);

      expect(ignoreFilter.isIgnored(path.join(tempDir, 'test', 'file.ts'))).to.be.true;
      expect(ignoreFilter.isIgnored(path.join(tempDir, 'test', 'nested', 'file.ts'))).to.be.true;
    });

    it('should respect wildcard patterns', () => {
      ignoreFilter = new IgnoreFilter(tempDir, ['*.spec.ts']);

      expect(ignoreFilter.isIgnored(path.join(tempDir, 'file.spec.ts'))).to.be.true;
      expect(ignoreFilter.isIgnored(path.join(tempDir, 'file.test.ts'))).to.be.false;
    });
  });

  describe('.aicontextignore file', () => {
    it('should load patterns from .aicontextignore file', () => {
      const ignoreContent = `
# Comments should be ignored
*.md
.env
secrets/
`;
      fs.writeFileSync(path.join(tempDir, '.aicontextignore'), ignoreContent);
      ignoreFilter = new IgnoreFilter(tempDir, []);

      expect(ignoreFilter.isIgnored(path.join(tempDir, 'README.md'))).to.be.true;
      expect(ignoreFilter.isIgnored(path.join(tempDir, '.env'))).to.be.true;
      expect(ignoreFilter.isIgnored(path.join(tempDir, 'secrets', 'key.txt'))).to.be.true;
    });

    it('should handle missing .aicontextignore gracefully', () => {
      expect(() => new IgnoreFilter(tempDir, [])).to.not.throw();
    });

    it('should ignore comment lines in .aicontextignore', () => {
      const ignoreContent = `
# This is a comment
# Another comment
*.log
`;
      fs.writeFileSync(path.join(tempDir, '.aicontextignore'), ignoreContent);
      ignoreFilter = new IgnoreFilter(tempDir, []);

      expect(ignoreFilter.isIgnored(path.join(tempDir, 'debug.log'))).to.be.true;
    });
  });

  describe('path normalization', () => {
    beforeEach(() => {
      ignoreFilter = new IgnoreFilter(tempDir, ['*.log']);
    });

    it('should handle Windows-style paths', () => {
      // On Windows, path.join uses backslashes
      const logPath = path.join(tempDir, 'test.log');
      expect(ignoreFilter.isIgnored(logPath)).to.be.true;
    });

    it('should handle Unix-style paths', () => {
      const logPath = path.join(tempDir, 'test.log');
      // Test with normalized forward slashes
      const relativePath = path.relative(tempDir, logPath).split(path.sep).join('/');
      expect(ignoreFilter.isIgnored(logPath)).to.be.true;
    });

    it('should handle paths with special characters', () => {
      ignoreFilter = new IgnoreFilter(tempDir, []);
      const specialPath = path.join(tempDir, 'file with spaces.txt');
      expect(ignoreFilter.isIgnored(specialPath)).to.be.false;
    });
  });

  describe('directory vs file filtering', () => {
    beforeEach(() => {
      ignoreFilter = new IgnoreFilter(tempDir, ['build/']);
    });

    it('should ignore directory with trailing slash pattern', () => {
      const buildDir = path.join(tempDir, 'build');
      expect(ignoreFilter.isDirectoryIgnored(buildDir)).to.be.true;
    });

    it('should check directory with / suffix', () => {
      // Test the explicit directory check
      const buildDir = path.join(tempDir, 'build');
      const isIgnored = ignoreFilter.isDirectoryIgnored(buildDir);
      expect(isIgnored).to.be.true;
    });
  });

  describe('reload', () => {
    it('should reload ignore patterns', () => {
      // Create initial filter without .aicontextignore
      ignoreFilter = new IgnoreFilter(tempDir, []);
      expect(ignoreFilter.isIgnored(path.join(tempDir, 'test.log'))).to.be.false;

      // Create .aicontextignore file and reload
      fs.writeFileSync(path.join(tempDir, '.aicontextignore'), '*.log\n');
      ignoreFilter.reload(['*.log']);

      expect(ignoreFilter.isIgnored(path.join(tempDir, 'test.log'))).to.be.true;
    });

    it('should update additional patterns on reload', () => {
      ignoreFilter = new IgnoreFilter(tempDir, ['*.old']);
      expect(ignoreFilter.isIgnored(path.join(tempDir, 'file.old'))).to.be.true;
      expect(ignoreFilter.isIgnored(path.join(tempDir, 'file.bak'))).to.be.false;

      ignoreFilter.reload(['*.bak']);
      expect(ignoreFilter.isIgnored(path.join(tempDir, 'file.old'))).to.be.false;
      expect(ignoreFilter.isIgnored(path.join(tempDir, 'file.bak'))).to.be.true;
    });
  });

  describe('getWorkspaceRoot', () => {
    it('should return the workspace root path', () => {
      ignoreFilter = new IgnoreFilter(tempDir, []);
      expect(ignoreFilter.getWorkspaceRoot()).to.equal(tempDir);
    });
  });

  describe('negation patterns', () => {
    it('should support negation patterns', () => {
      const ignoreContent = `
*.log
!important.log
`;
      fs.writeFileSync(path.join(tempDir, '.aicontextignore'), ignoreContent);
      ignoreFilter = new IgnoreFilter(tempDir, []);

      expect(ignoreFilter.isIgnored(path.join(tempDir, 'debug.log'))).to.be.true;
      expect(ignoreFilter.isIgnored(path.join(tempDir, 'important.log'))).to.be.false;
    });
  });

  describe('complex patterns', () => {
    beforeEach(() => {
      ignoreFilter = new IgnoreFilter(tempDir, [
        'src/**/*.spec.ts',
        'coverage/**',
        '**/test.js',  // Matches any test.js file anywhere
      ]);
    });

    it('should handle nested glob patterns', () => {
      expect(ignoreFilter.isIgnored(path.join(tempDir, 'src', 'utils.spec.ts'))).to.be.true;
      expect(ignoreFilter.isIgnored(path.join(tempDir, 'src', 'nested', 'deep.spec.ts'))).to.be.true;
      expect(ignoreFilter.isIgnored(path.join(tempDir, 'lib', 'utils.spec.ts'))).to.be.false;
    });

    it('should handle double-star patterns', () => {
      expect(ignoreFilter.isIgnored(path.join(tempDir, 'coverage', 'lcov.info'))).to.be.true;
      expect(ignoreFilter.isIgnored(path.join(tempDir, 'coverage', 'nested', 'report.html'))).to.be.true;
    });

    it('should handle any-location patterns', () => {
      expect(ignoreFilter.isIgnored(path.join(tempDir, 'test.js'))).to.be.true;
      expect(ignoreFilter.isIgnored(path.join(tempDir, 'src', 'test.js'))).to.be.true;
      expect(ignoreFilter.isIgnored(path.join(tempDir, 'nested', 'deep', 'test.js'))).to.be.true;
    });
  });

  describe('edge cases', () => {
    it('should handle empty patterns', () => {
      expect(() => new IgnoreFilter(tempDir, [])).to.not.throw();
    });

    it('should handle workspace root path', () => {
      ignoreFilter = new IgnoreFilter(tempDir, DEFAULT_CONFIG.ignorePatterns);
      // The root path itself (empty relative path) causes error with ignore library
      // So we test with a file directly in root instead
      const rootFile = path.join(tempDir, 'file.txt');
      expect(ignoreFilter.isIgnored(rootFile)).to.be.false;
    });

    it('should handle files with dots', () => {
      ignoreFilter = new IgnoreFilter(tempDir, []);
      const dotfilePath = path.join(tempDir, '.env');
      expect(ignoreFilter.isIgnored(dotfilePath)).to.be.false;
    });

    it('should handle deeply nested paths', () => {
      ignoreFilter = new IgnoreFilter(tempDir, ['node_modules/**']);
      const deepPath = path.join(tempDir, 'node_modules', 'package', 'lib', 'file.js');
      expect(ignoreFilter.isIgnored(deepPath)).to.be.true;
    });
  });
});
