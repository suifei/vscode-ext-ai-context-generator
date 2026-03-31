<div align="center">
  <img src="assets/logo.png" width="128" height="128" alt="AI Context Generator Logo">
  <h1>AI Context Generator</h1>
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
  - Binary: Metadata extraction
- **Flexible Output**: Clipboard, file, or preview tab
- **Token Counting**: Tiktoken (accurate) or simple estimation
- **Custom Templates**: `.ai_context_templates/*.md` with variables

### Installation

```
Press Ctrl+Shift+X → Search "AI Context Generator" → Install
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

## 简体中文

VSCode 扩展，将项目代码转换为结构化 Markdown 上下文，用于 AI 助手交互。

**右键点击任意文件/文件夹** → 生成到剪切板/文件/预览

### 功能特性

- **智能过滤**: 支持 `.aicontextignore`（自动合并 `.gitignore`）
- **智能处理**:
  - 代码文件: 完整内容 + 语法高亮
  - 大文件 (>50KB): AST 结构大纲（TS/Py/Go/Rust/Java/C++）
  - 日志/CSV/配置: 智能摘要
  - 二进制: 元数据提取
- **灵活输出**: 剪贴板、文件、预览标签页
- **Token 计数**: Tiktoken 精确计数或简单估算
- **自定义模板**: `.ai_context_templates/*.md` 支持变量

### 安装

```
按 Ctrl+Shift+X → 搜索 "AI Context Generator" → 安装
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

## License

MIT

## Links

- [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=suifei.ai-context-generator)
- [GitHub](https://github.com/suifei/vscode-ext-ai-context-generator)
