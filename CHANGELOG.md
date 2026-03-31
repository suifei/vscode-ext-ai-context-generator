# Changelog

All notable changes for the "AI Context Generator" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-03-31

### Added
- **大文件降级开关**: 新增 `enableLargeFileDegradation` 配置和切换命令
  - 开启时：文件 > 50KB 自动使用大纲/摘要模式
  - 关闭时：所有文件全文读取
  - 右键菜单 → "启用超大内容降级/压缩提取" 切换
- **.gitignore 自动读取**: 自动合并项目 `.gitignore` 到忽略模式
- **代码质量工具**:
  - `errorUtils.ts`: 统一错误处理（消除 5 处重复）
  - `gitUtils.ts`: .gitignore 读取工具（消除 2 处重复）
  - `normalizePathSeparators()`: 路径规范化工具
- **测试覆盖**: 新增 14 个单元测试（总计 219 tests passing）

### Changed
- **代码重构**: 应用 DRY/KISS/YAGNI 原则
  - 提取 `executeGeneration()` 简化 `generateContext()`
  - 内联 `filesToList()` 消除单次使用函数
  - 重构 `IgnoreFilter.loadPatterns()` 自动读取 .gitignore
- **配置项说明**: 添加 `.gitignore` 自动合并和模板位置说明

### Documentation
- **架构文档重组**: 6 个核心文档完成治理
  - `ARCHITECTURE.md`: 更新数据流图与模块职责
  - `PRD.md`: 重写产品需求，与 package.json 完全对齐
  - `TECH-DEBT.md`: 移除已清理项，添加无债务评估
  - `ADR-GUIDE.md**: 补充 3 个架构决策 + 已知限制
  - `README.md`: 精简 40%，保留核心功能说明

### Refactor
- 净删除 1837 行冗余代码和文档

---

## [Unreleased] (Previous)

### Added
- **Enhanced Outline Module**: Complete rewrite of outline extraction system
  - New `ASTExtractor` using hierarchical DocumentSymbol API
  - Improved error handling with graceful fallbacks
  - Document caching for better performance (5s TTL, 50 entry limit)
  - Unified output formatter for consistent formatting
- **Outline Configuration Options**:
  - `aiContext.outlineDetail` - Control detail level (basic/standard/detailed)
  - `aiContext.outlineIncludePrivate` - Include private members in outline
  - `aiContext.outlineExtractComments` - Extract comments and docstrings
  - `aiContext.outlineMaxItems` - Max items per section (10-200)
- **Comprehensive Unit Tests**: Added 60+ tests for outline module

### Changed
- **Three-Tier Extraction Strategy**:
  1. ASTExtractor (hierarchical symbols) for supported languages
  2. OutlineExtractor (flat symbols) as intermediate fallback
  3. RegexFallback (pattern matching) as final fallback
- **Improved Registry**: Better language detection and automatic fallback logic
- **Enhanced Output Format**:
  - Shows member counts per section
  - Displays visibility modifiers (private, protected, public)
  - Shows line numbers and code signatures
  - Hierarchical type structure with nested members

### Fixed
- Outline extraction no longer fails silently when LSP is unavailable
- Better handling of large files with partial symbol information
- Consistent output format between LSP and regex fallback

### Planned
- Additional language support for AST outline (Ruby, Swift, PHP, etc.)
- Custom template editor UI
- Export to other formats (PDF, HTML)

## [1.2.0] - 2026-03-30

### Added
- **Direct Output Commands**: Three dedicated commands for immediate output to clipboard, file, or preview - no more QuickPick dialog
- **File Overwrite Confirmation**: Modal dialog when saving to existing file
- **Auto-open Generated File**: Automatically opens the generated file after saving

### Changed
- **Simplified Right-Click Menu**: Direct access to output targets without intermediate selection
  - "Generate AI Context to Clipboard" - copies directly
  - "Generate AI Context to File" - saves to workspace root
  - "Generate AI Context to Preview" - opens in new tab
- **Simplified Configuration**: Removed `defaultOutputTarget` setting (no longer needed)
- **Cleaner Ignore Patterns**: Removed `dist/**`, `*.min.js`, `*.min.css` from default patterns
- **Improved Configuration Descriptions**:
  - `maxTokens`: Clarified it's local counting, not calling AI API
  - `sensitiveKeyPatterns`: Clarified auto-filtering for security
  - `outputFileName`: Clarified save location and overwrite behavior

### Removed
- `aiContext.defaultOutputTarget` configuration setting

## [1.1.0] - 2026-03-30

### Added
- **Smart Context Detection**: Directory tree now starts from the common parent of selected files/folders, not always from workspace root
- **Explorer Context Menu**: Simplified right-click menu with submenu organization
- **Intelligent Generate Command**: Single command that automatically handles files, folders, and multi-selection
- **Large File Outline Extraction**: For code files exceeding size threshold (>50KB), AST-based structure outline is now automatically generated instead of regex-based analysis

### Changed
- **Simplified Menu Structure**:
  - Removed separate "Workspace", "Folder", and "Selected" commands
  - Unified into single "Generate AI Context" command
  - Added submenu for better organization
- **Removed WebView Sidebar**: Simplified extension by removing the sidebar panel (less invasive, better UX)
- **Removed Keyboard Shortcuts**: Kept the extension simpler with no default keybindings

### Fixed
- Directory tree now correctly shows only the selected folder's structure when a subfolder is chosen
- Project name in template now reflects the selected folder instead of always showing workspace name
- **Large file processing**: JavaScript/TypeScript files now use AST-based outline extraction instead of falling back to generic regex analyzer
- **Outline count accuracy**: `$OUTLINE_COUNT` now correctly counts only files that actually generated structure outlines
- **DRY violation**: Removed duplicate file headers from outline extractors

### Code Quality
- Reduced codebase by 375 lines (-69% from removed components)
- Followed DRY, KISS, and YAGNI principles
- All 143 unit tests passing

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
