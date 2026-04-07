<div align="center">
  <img src="assets/logo.png" width="128" height="128" alt="AI Context Generator Logo">
  <h1>AI Context Generator (Advanced)</h1>
</div>

[English](#english) | [简体中文](#简体中文)

---

## English

A VSCode extension that generates structured Markdown context from project files for AI assistant interactions.

**Right-click any file/folder** → Generate to Clipboard/File/Preview

### Features

- **Smart Filtering**: `.aicontextignore` support (auto-merges `.gitignore`)
- **Intelligent Processing**:
  - Code files: Full content with syntax highlighting
  - Large files (>50KB): AST-based outline (TS/Py/Go/Rust/Java/C++)
  - Logs/CSV/Config: Smart summaries
  - **Office Documents**: Text extraction with smart summarization (PDF/Word/Excel/PowerPoint)
  - Binary: Metadata extraction
- **Flexible Output**: Clipboard, file, or preview tab
- **Token Counting**: Tiktoken (accurate) or simple estimation
- **Custom Templates**: `.ai_context_templates/*.md` with variables
- **Smart Text Summarization**: TextRank algorithm for intelligent content compression

### Installation

```
Press Ctrl+Shift+X → Search "AI Context Generator (Advanced)" → Install
```

### Quick Start

**Right-click menu**:
- Generate AI Context to Clipboard
- Generate AI Context to File
- Generate AI Context to Preview

**Command Palette** (`Ctrl+Shift+P`):
- `AI Context Generator: Generate AI Context`
- `AI Context Generator: Open Logs`
- `AI Context Generator: Generate .aicontextignore`

### Configuration

Create `.aicontextignore` in project root (same syntax as `.gitignore`):

```
node_modules/**
dist/**
*.min.js
```

**Key Settings** (`aiContext.*`):

| Setting | Default | Description |
|---------|---------|-------------|
| `maxFileSize` | 51200 | File size threshold for outline mode (bytes) |
| `maxTokens` | 128000 | Token warning threshold (local counting, no AI API) |
| `enableLargeFileDegradation` | true | Enable large file outline/summary mode |

### Template Variables

| Variable | Description |
|----------|-------------|
| `$PROJECT_NAME` | Project/folder name |
| `$DIR_TREE` | ASCII directory tree with emoji |
| `$FILE_CONTENTS` | Formatted file contents |
| `$TOKEN_COUNT` | Total token count |
| `$FILE_COUNT` | Number of files |

---

## Technical Highlights

### 🧠 Intelligent Layered Processing

The extension uses a **layered processing architecture** that automatically selects the optimal processing strategy based on file type and size:

| File Type | Processing Method | Output |
|-----------|------------------|--------|
| Small code files (≤50KB) | Full read | Source code + syntax highlighting |
| Large code files (>50KB) | AST outline extraction | Type definitions, function signatures, call relations |
| Log files (.log) | Pattern analysis | Log level distribution, error patterns, time range |
| Data files (.csv/.tsv) | Structure inference | Field types, sample data, statistics |
| Config files (JSON/YAML) | Smart summarization | Structure skeleton, sensitive data redaction |
| Document files (.md/.txt) | Content analysis | Section outline, keyword extraction |
| **PDF (.pdf)** | Text extraction + TextRank summary | Page structure, key sentences |
| **Word (.docx)** | Text extraction + TextRank summary | Paragraph structure, key points |
| **Excel (.xlsx/.xls)** | Spreadsheet analysis | Sheet schemas, column types, sample data |
| **PowerPoint (.pptx)** | Slide text extraction | Slide titles, content summary |
| Binary files | Metadata extraction | Format info, dimensions/duration, etc. |

### 🏗️ AST Outline Extraction Algorithm

For large code files, the extension uses **LSP-based AST outline extraction**:

```
1. Leverage VSCode's DocumentSymbol API to obtain symbol tree
2. Build hierarchical structure: Class → Method → Property
3. Extract function signatures and call relationships (→ calls: notation)
4. Supported languages: TS/JS, Python, Go, Rust, Java, C/C++
```

**Benefits**:
- Generates concise structural outlines even for files with tens of thousands of lines
- Preserves complete type information and function signatures
- Significantly reduces token consumption (typically 90%+ compression)

### 📊 Smart Summary Engine

For non-code files, the extension has **dedicated analyzers**:

- **Log Analyzer**: Identifies log level distribution (INFO/WARN/ERROR), detects error patterns, extracts key time ranges
- **Config Analyzer**: Parses JSON/YAML structure, auto-redacts sensitive fields (password/token/secret)
- **Doc Analyzer**: Extracts Markdown heading hierarchy, keywords, and paragraph summaries
- **CSV Analyzer**: Infers field types, detects numeric ranges, provides data samples
- **PDF Analyzer**: Extracts text with page structure, uses TextRank for intelligent summarization
- **Word Analyzer**: Extracts .docx text with paragraph detection, generates smart summaries
- **Excel Analyzer**: Analyzes workbook structure, multiple sheets with schema inference
- **PowerPoint Analyzer**: Extracts slide titles and content, provides presentation summary

**TextRank Algorithm**:
- Jaccard similarity for sentence ranking (supports UTF-8/Unicode)
- Extracts key sentences based on content importance
- Preserves sentence structure and readability
- Works with both English and Chinese text

### ⚡ Performance Optimization Design

- **Parallel File Reading**: Batch concurrent file reading (default 50 concurrent)
- **LRU Cache**: AST outline extraction results cached (5min TTL, max 100 entries)
- **Incremental Filtering**: Intelligently merges `.gitignore` and `.aicontextignore` rules
- **Lazy Evaluation**: LSP services only invoked when needed

### 🔒 Privacy First

- **100% Local Processing**: No network requests, no code uploads
- **Sensitive Data Protection**: Auto-detects and redacts passwords, tokens in config files
- **Controlled Output**: Full control over generated content, decide which files to include

### 🔄 Processing Pipeline

```
┌─────────────────┐
│  Select Scope    │  Workspace/Folder/Selected Files
└────────┬────────┘
         ▼
┌─────────────────┐
│  Smart Filter    │  .aicontextignore + .gitignore
└────────┬────────┘
         ▼
┌─────────────────┐
│  File Scan       │  Recursive traversal, parallel read (50 concurrent)
└────────┬────────┘
         ▼
┌─────────────────┐
│  Classification  │
│  ├─ Code Files   │  → Full content / AST outline
│  ├─ Config Files │  → Structure summary + redaction
│  ├─ Logs/Data    │  → Smart analysis
│  └─ Binary Files │  → Metadata extraction
└────────┬────────┘
         ▼
┌─────────────────┐
│  Tree Generate   │  ASCII tree with emoji markers
└────────┬────────┘
         ▼
┌─────────────────┐
│  Token Count     │  Tiktoken accurate counting
└────────┬────────┘
         ▼
┌─────────────────┐
│  Template Render │  Replace $VARIABLE placeholders
└────────┬────────┘
         ▼
┌─────────────────┐
│  Output Result   │  Clipboard / File / Preview Tab
└─────────────────┘
```

---

## 简体中文

VSCode 扩展，将项目代码转换为结构化 Markdown 上下文，用于 AI 助手交互。

**右键点击任意文件/文件夹** → 生成到剪切板/文件/预览

### 功能特性

- **智能过滤**: 支持 `.aicontextignore`（自动合并 `.gitignore`）
- **智能处理**:
  - 代码文件: 完整内容 + 语法高亮
  - 大文件 (>50KB): AST 结构大纲（TS/Py/Go/Rust/Java/C++）
  - 日志/CSV/配置: 智能摘要
  - **Office 文档**: 文本提取 + 智能摘要（PDF/Word/Excel/PowerPoint）
  - 二进制: 元数据提取
- **灵活输出**: 剪贴板、文件、预览标签页
- **Token 计数**: Tiktoken 精确计数或简单估算
- **自定义模板**: `.ai_context_templates/*.md` 支持变量

### 安装

```
按 Ctrl+Shift+X → 搜索 "AI Context Generator (Advanced)" → 安装
```

### 快速开始

**右键菜单**:
- 生成 AI 上下文到剪切板
- 生成 AI 上下文到文件
- 生成 AI 上下文到预览窗口

**命令面板** (`Ctrl+Shift+P`):
- `AI 上下文生成器: 生成 AI 上下文`
- `AI 上下文生成器: 打开日志`
- `AI 上下文生成器: 生成 .aicontextignore`

### 配置

在项目根目录创建 `.aicontextignore`（与 `.gitignore` 语法相同）:

```
node_modules/**
dist/**
*.min.js
```

**核心设置** (`aiContext.*`):

| 设置 | 默认值 | 说明 |
|------|--------|------|
| `maxFileSize` | 51200 | 触发大纲模式的文件大小阈值（字节） |
| `maxTokens` | 128000 | Token 警告阈值（本地计数，不调用 AI） |
| `enableLargeFileDegradation` | true | 启用大文件大纲/摘要模式 |

### 模板变量

| 变量 | 说明 |
|------|------|
| `$PROJECT_NAME` | 项目/文件夹名称 |
| `$DIR_TREE` | 带 emoji 的 ASCII 目录树 |
| `$FILE_CONTENTS` | 格式化的文件内容 |
| `$TOKEN_COUNT` | 总 Token 数 |
| `$FILE_COUNT` | 文件数量 |

---

## 技术亮点

### 🧠 智能分层处理策略

插件采用**分层处理架构**，根据文件类型和大小自动选择最优处理方案：

| 文件类型 | 处理方式 | 输出内容 |
|---------|---------|----------|
| 小型代码文件 (≤50KB) | 完整读取 | 源代码 + 语法高亮 |
| 大型代码文件 (>50KB) | AST 大纲提取 | 类型定义、函数签名、调用关系 |
| 日志文件 (.log) | 模式分析 | 日志级别分布、错误模式、时间范围 |
| 数据文件 (.csv/.tsv) | 结构推断 | 字段类型、样本数据、统计信息 |
| 配置文件 (JSON/YAML) | 智能摘要 | 结构骨架、敏感数据脱敏 |
| 文档文件 (.md/.txt) | 内容分析 | 章节大纲、关键词提取 |
| **PDF (.pdf)** | 文本提取 + TextRank 摘要 | 页面结构、关键句子 |
| **Word (.docx)** | 文本提取 + TextRank 摘要 | 段落结构、关键点 |
| **Excel (.xlsx/.xls)** | 表格分析 | 工作表结构、列类型、样本数据 |
| **PowerPoint (.pptx)** | 幻灯片文本提取 | 幻灯片标题、内容摘要 |
| 二进制文件 | 元数据提取 | 格式信息、尺寸/时长等 |

### 🏗️ AST 大纲提取算法

对于大型代码文件，插件使用**基于 LSP 的 AST 大纲提取**技术：

```
1. 利用 VSCode 的 DocumentSymbol API 获取符号树
2. 构建层级结构：类 → 方法 → 属性
3. 提取函数签名和调用关系 (→ calls: 符号)
4. 支持语言：TS/JS、Python、Go、Rust、Java、C/C++
```

**优势**：
- 即使数万行的文件也能生成简洁的结构大纲
- 保留完整的类型信息和函数签名
- 显著减少 Token 消耗（通常压缩 90%+）

### 📊 智能摘要引擎

针对非代码文件，插件内置了**专用分析器**：

- **日志分析器**：识别日志级别分布 (INFO/WARN/ERROR)、检测错误模式、提取关键时间范围
- **配置分析器**：解析 JSON/YAML 结构、自动脱敏敏感字段 (password/token/secret)
- **文档分析器**：提取 Markdown 标题层级、关键词和段落摘要
- **CSV 分析器**：推断字段类型、检测数值范围、提供数据样本
- **PDF 分析器**：提取文本并按页面结构组织，使用 TextRank 生成智能摘要
- **Word 分析器**：提取 .docx 文本并检测段落结构，生成智能摘要
- **Excel 分析器**：分析工作簿结构，支持多个工作表的类型推断
- **PowerPoint 分析器**：提取幻灯片标题和内容，生成演示文稿摘要

**TextRank 算法**：
- 使用 Jaccard 相似度进行句子排序（支持 UTF-8/Unicode）
- 基于内容重要性提取关键句子
- 保持句子结构和可读性
- 同时支持中英文文本

### ⚡ 性能优化设计

- **并行文件读取**：批量并发读取文件（默认 50 并发）
- **LRU 缓存**：AST 大纲提取结果缓存（5分钟 TTL，最多100条）
- **增量过滤**：智能合并 `.gitignore` 和 `.aicontextignore` 规则
- **惰性求值**：仅在需要时调用 LSP 服务

### 🔒 隐私优先

- **100% 本地处理**：无需任何网络请求，不上传代码
- **敏感数据保护**：自动检测并脱敏配置文件中的密码、token 等敏感字段
- **可控输出**：完全掌控生成内容，决定哪些文件被包含

### 🔄 处理流程

```
┌─────────────────┐
│  选择范围        │  工作区/文件夹/选中文件
└────────┬────────┘
         ▼
┌─────────────────┐
│  智能过滤        │  .aicontextignore + .gitignore
└────────┬────────┘
         ▼
┌─────────────────┐
│  文件扫描        │  递归遍历，并行读取（50并发）
└────────┬────────┘
         ▼
┌─────────────────┐
│  分类处理        │
│  ├─ 代码文件     │  → 完整内容 / AST大纲
│  ├─ 配置文件     │  → 结构摘要 + 脱敏
│  ├─ 日志/数据    │  → 智能分析
│  └─ 二进制文件   │  → 元数据提取
└────────┬────────┘
         ▼
┌─────────────────┐
│  目录树生成      │  带 emoji 标记选中文件
└────────┬────────┘
         ▼
┌─────────────────┐
│  Token 计数     │  Tiktoken 精确计数
└────────┬────────┘
         ▼
┌─────────────────┐
│  模板渲染        │  替换 $VARIABLE 变量
└────────┬────────┘
         ▼
┌─────────────────┐
│  输出结果        │  剪贴板 / 文件 / 预览窗口
└─────────────────┘
```

---

## License

MIT

## Links

- [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=suifei.ai-context-generator-advanced)
- [GitHub](https://github.com/suifei/vscode-ext-ai-context-generator)
