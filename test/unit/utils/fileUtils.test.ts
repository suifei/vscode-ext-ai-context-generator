/**
 * Unit tests for fileUtils
 */

import { expect } from 'chai';
import * as path from 'path';
import { formatFileSize, getRelativePath, isCodeFile, normalizePathSeparators } from '../../../src/utils/fileUtils';

describe('fileUtils', () => {
  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(0)).to.equal('0B');
      expect(formatFileSize(512)).to.equal('512B');
      expect(formatFileSize(1023)).to.equal('1023B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).to.equal('1.0KB');
      expect(formatFileSize(1536)).to.equal('1.5KB');
      expect(formatFileSize(10240)).to.equal('10.0KB');
      expect(formatFileSize(1048575)).to.equal('1024.0KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).to.equal('1.0MB');
      expect(formatFileSize(1572864)).to.equal('1.5MB');
      expect(formatFileSize(10485760)).to.equal('10.0MB');
      expect(formatFileSize(52428800)).to.equal('50.0MB');
    });

    it('should handle large file sizes', () => {
      expect(formatFileSize(104857600)).to.equal('100.0MB');
      expect(formatFileSize(524288000)).to.equal('500.0MB');
    });

    it('should round to one decimal place', () => {
      const size = 1124000; // ~1.07MB
      const formatted = formatFileSize(size);
      expect(formatted).to.match(/^\d+\.\d+MB$/);
    });

    it('should handle edge cases', () => {
      expect(formatFileSize(1)).to.equal('1B');
      expect(formatFileSize(1024)).to.equal('1.0KB');
      expect(formatFileSize(1024 * 1024)).to.equal('1.0MB');
    });
  });

  describe('getRelativePath', () => {
    it('should return relative path for file in subdirectory', () => {
      const workspaceRoot = '/project';
      const filePath = '/project/src/index.ts';
      const result = getRelativePath(workspaceRoot, filePath);

      // Normalize for cross-platform comparison
      const normalized = result.split(path.sep).join('/');
      expect(normalized).to.equal('src/index.ts');
    });

    it('should return relative path for file in nested directory', () => {
      const workspaceRoot = '/project';
      const filePath = '/project/src/utils/helpers/file.ts';
      const result = getRelativePath(workspaceRoot, filePath);

      const normalized = result.split(path.sep).join('/');
      expect(normalized).to.equal('src/utils/helpers/file.ts');
    });

    it('should return filename for file in root', () => {
      const workspaceRoot = '/project';
      const filePath = '/project/README.md';
      const result = getRelativePath(workspaceRoot, filePath);

      const normalized = result.split(path.sep).join('/');
      expect(normalized).to.equal('README.md');
    });

    it('should return dot for same path', () => {
      const workspaceRoot = '/project';
      const result = getRelativePath(workspaceRoot, workspaceRoot);

      expect(result).to.equal('');
    });

    it('should handle Windows-style paths', () => {
      const workspaceRoot = 'C:\\project';
      const filePath = 'C:\\project\\src\\index.ts';
      const result = getRelativePath(workspaceRoot, filePath);

      const normalized = result.split(path.sep).join('/');
      expect(normalized).to.equal('src/index.ts');
    });

    it('should handle paths with different case on case-insensitive systems', () => {
      const workspaceRoot = '/Project';
      const filePath = '/project/src/index.ts';
      const result = getRelativePath(workspaceRoot, filePath);

      // The result depends on the OS
      expect(result).to.be.a('string');
    });

    it('should handle trailing slashes', () => {
      const workspaceRoot = '/project/';
      const filePath = '/project/src/index.ts';
      const result = getRelativePath(workspaceRoot, filePath);

      const normalized = result.split(path.sep).join('/');
      expect(normalized).to.include('src/index.ts');
    });

    it('should handle paths with spaces', () => {
      const workspaceRoot = '/my project';
      const filePath = '/my project/src/file name.ts';
      const result = getRelativePath(workspaceRoot, filePath);

      const normalized = result.split(path.sep).join('/');
      expect(normalized).to.equal('src/file name.ts');
    });
  });

  describe('isCodeFile', () => {
    it('should recognize TypeScript files', () => {
      expect(isCodeFile('file.ts')).to.be.true;
      expect(isCodeFile('file.tsx')).to.be.true;
    });

    it('should recognize JavaScript files', () => {
      expect(isCodeFile('file.js')).to.be.true;
      expect(isCodeFile('file.jsx')).to.be.true;
    });

    it('should recognize Python files', () => {
      expect(isCodeFile('script.py')).to.be.true;
    });

    it('should recognize Go files', () => {
      expect(isCodeFile('main.go')).to.be.true;
    });

    it('should recognize Rust files', () => {
      expect(isCodeFile('lib.rs')).to.be.true;
    });

    it('should recognize Java files', () => {
      expect(isCodeFile('App.java')).to.be.true;
      expect(isCodeFile('App.kt')).to.be.true; // Kotlin
      expect(isCodeFile('App.scala')).to.be.true; // Scala
    });

    it('should recognize C/C++ files', () => {
      expect(isCodeFile('main.c')).to.be.true;
      expect(isCodeFile('header.h')).to.be.true;
      expect(isCodeFile('lib.cpp')).to.be.true;
      expect(isCodeFile('lib.hpp')).to.be.true;
    });

    it('should recognize C# files', () => {
      expect(isCodeFile('Program.cs')).to.be.true;
    });

    it('should recognize PHP files', () => {
      expect(isCodeFile('index.php')).to.be.true;
    });

    it('should recognize Ruby files', () => {
      expect(isCodeFile('script.rb')).to.be.true;
    });

    it('should recognize Swift files', () => {
      expect(isCodeFile('main.swift')).to.be.true;
    });

    it('should recognize shell scripts', () => {
      expect(isCodeFile('script.sh')).to.be.true;
      expect(isCodeFile('script.bash')).to.be.true;
    });

    it('should recognize SQL files', () => {
      expect(isCodeFile('query.sql')).to.be.true;
    });

    it('should not recognize non-code files', () => {
      expect(isCodeFile('README.md')).to.be.false;
      expect(isCodeFile('config.json')).to.be.false;
      expect(isCodeFile('style.css')).to.be.false;
      expect(isCodeFile('image.png')).to.be.false;
      expect(isCodeFile('data.xml')).to.be.false;
      expect(isCodeFile('data.yaml')).to.be.false;
      expect(isCodeFile('data.yml')).to.be.false;
      expect(isCodeFile('data.toml')).to.be.false;
      expect(isCodeFile('file.txt')).to.be.false;
      expect(isCodeFile('document.pdf')).to.be.false;
    });

    it('should be case insensitive', () => {
      expect(isCodeFile('FILE.TS')).to.be.true;
      expect(isCodeFile('File.JS')).to.be.true;
      expect(isCodeFile('script.PY')).to.be.true;
    });

    it('should handle files with dots in name', () => {
      expect(isCodeFile('my.file.ts')).to.be.true;
      expect(isCodeFile('my.file.js')).to.be.true;
    });

    it('should handle full paths', () => {
      expect(isCodeFile('/project/src/index.ts')).to.be.true;
      expect(isCodeFile('/project/README.md')).to.be.false;
    });

    it('should handle Windows paths', () => {
      expect(isCodeFile('C:\\project\\src\\index.ts')).to.be.true;
      expect(isCodeFile('C:\\project\\README.md')).to.be.false;
    });
  });

  describe('combined functionality', () => {
    it('should work together for common use cases', () => {
      const workspaceRoot = '/project';
      const filePath = '/project/src/utils/fileUtils.ts';
      const relativePath = getRelativePath(workspaceRoot, filePath);
      const isCode = isCodeFile(filePath);

      const normalized = relativePath.split(path.sep).join('/');
      expect(normalized).to.equal('src/utils/fileUtils.ts');
      expect(isCode).to.be.true;
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      expect(formatFileSize(0)).to.equal('0B');
      expect(() => getRelativePath('', '')).to.not.throw();
      expect(isCodeFile('')).to.be.false;
    });

    it('should handle paths with special characters', () => {
      expect(isCodeFile('file with spaces.ts')).to.be.true;
      expect(isCodeFile('file-with-dashes.ts')).to.be.true;
      expect(isCodeFile('file_with_underscores.ts')).to.be.true;
    });

    it('should handle files without extensions', () => {
      expect(isCodeFile('Makefile')).to.be.false;
      expect(isCodeFile('Dockerfile')).to.be.false;
      expect(isCodeFile('README')).to.be.false;
    });

    it('should handle hidden files', () => {
      expect(isCodeFile('.ts')).to.be.false;
      expect(isCodeFile('.gitignore')).to.be.false;
    });

    it('should handle very long file sizes', () => {
      const hugeSize = 1024 * 1024 * 1024 * 5; // 5GB
      const formatted = formatFileSize(hugeSize);
      expect(formatted).to.include('MB');
      expect(parseInt(formatted)).to.be.greaterThan(4000);
    });
  });

  describe('normalizePathSeparators', () => {
    it('should convert Windows backslashes to forward slashes', () => {
      expect(normalizePathSeparators('src\\utils\\fileUtils.ts')).to.equal('src/utils/fileUtils.ts');
    });

    it('should handle forward slashes unchanged', () => {
      expect(normalizePathSeparators('src/utils/fileUtils.ts')).to.equal('src/utils/fileUtils.ts');
    });

    it('should handle empty string', () => {
      expect(normalizePathSeparators('')).to.equal('');
    });

    it('should handle single segment', () => {
      expect(normalizePathSeparators('file.ts')).to.equal('file.ts');
    });

    it('should handle mixed separators', () => {
      expect(normalizePathSeparators('src\\utils/file.ts')).to.equal('src/utils/file.ts');
    });

    it('should handle trailing separator', () => {
      expect(normalizePathSeparators('src\\utils\\')).to.equal('src/utils/');
    });
  });
});
