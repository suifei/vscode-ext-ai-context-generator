# Changelog

All notable changes for the "AI Context Generator" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Additional language support for AST outline (Ruby, Swift, PHP, etc.)
- Custom template editor UI
- Export to other formats (PDF, HTML)

## [1.0.0] - 2025-03-30

### Added
- Initial stable release
- **Logging System**: Output channel for debugging and troubleshooting
  - Four log levels: DEBUG, INFO, WARN, ERROR
  - Logs displayed in VSCode Output Panel ("AI Context Generator" channel)
  - Configurable via `aiContext.logLevel` setting
  - Command: `AI Context Generator: Open Logs` to view output panel
  - Logs key operations: command invocation, file scanning, token counting, errors
- **Testing Infrastructure**: Complete unit test suite with Mocha and Chai
  - 143 tests across 5 core modules (all passing)
  - TokenCounter tests (tiktoken/simple mode, edge cases)
  - IgnoreFilter tests (gitignore syntax, path normalization)
  - DirTreeGenerator tests (tree structure, emoji highlighting, depth limits)
  - TemplateRenderer tests (variable substitution, template loading)
  - fileUtils tests (formatting, path handling, code file detection)
- **Performance Optimizations**:
  - Async file scanning with parallel subdirectory processing
  - TokenCounter with singleton encoding cache (30-50% memory reduction)
  - Improved large project scan performance (40-60% faster)
- Generate AI context for workspace, folder, or selected files
- `.aicontextignore` file support for filtering files
- Smart file processing:
  - Syntax highlighting for code files
  - AST-based outline for large files (>50KB)
  - Log file analysis with level distribution
  - CSV/TSV schema inference
  - Config file structure with sensitive data redaction
  - Binary file metadata extraction
- Multiple output options: clipboard, file, preview
- Token counting with tiktoken or simple estimation
- Custom template support with variables
- WebView sidebar with interactive UI
- Keyboard shortcuts (Ctrl/Cmd+Shift+Alt+C/F/S)
- Multi-language support (English, Simplified Chinese)
- Full configuration via VSCode settings

### Changed
- FileScanner now uses async operations for better performance
- TokenCounter uses shared encoding cache for memory efficiency

### Configuration
- `aiContext.maxFileSize` - File size threshold (default: 50KB)
- `aiContext.maxTokens` - Token warning limit (default: 128K)
- `aiContext.defaultOutputTarget` - Output destination (clipboard/file/preview)
- `aiContext.tokenEstimation` - Token counting method
- `aiContext.showTreeEmoji` - Show emoji in directory tree
- `aiContext.ignorePatterns` - Additional ignore patterns
- `aiContext.binaryFilePatterns` - Binary file patterns
- `aiContext.sensitiveKeyPatterns` - Sensitive key detection patterns
- `aiContext.parallelFileReads` - Parallel read limit

### Keyboard Shortcuts
- `Ctrl/Cmd+Shift+Alt+C` - Generate for workspace
- `Ctrl/Cmd+Shift+Alt+F` - Generate for folder
- `Ctrl/Cmd+Shift+Alt+S` - Generate for selected files

## [0.1.0] - 2025-03-29

### Added
- Initial development version
- Basic file scanning and Markdown generation
