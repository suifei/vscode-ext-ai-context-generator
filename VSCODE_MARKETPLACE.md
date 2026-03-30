# AI Context Generator - VSCode Marketplace Description

## Extension Description (English)

Generate structured Markdown context from your project files for AI assistant interactions. Perfect for preparing code context when working with ChatGPT, Claude, Copilot, or other AI coding assistants.

## Features

### Smart File Filtering
- Supports `.aicontextignore` file (same syntax as `.gitignore`) to exclude unwanted files
- Pre-configured to ignore `node_modules`, `dist`, `build`, and other common build artifacts

### Intelligent Content Processing
- **Code files**: Full content with syntax highlighting
- **Large files** (>50KB): AST-based structure outline for TypeScript, Python, Go, Rust, Java, C/C++
- **Log files**: Level distribution and error pattern sampling
- **CSV/TSV files**: Schema inference and data sampling
- **Config files** (JSON/YAML): Structure skeleton with sensitive data redaction (passwords, tokens, API keys)
- **Binary files**: Metadata extraction (dimensions, duration, format)

### Flexible Output Options
- **Clipboard**: Quick copy to paste into AI chat
- **File**: Save as Markdown file for later use
- **Preview**: Open in VSCode for review before using

### Token Management
- Accurate token counting using tiktoken (GPT-4 compatible)
- Configurable warning threshold (default: 128K tokens)
- Lightweight estimation mode available

### Customizable Templates
- Built-in default template
- Support for custom templates in `.ai_context_templates/` directory
- Template variables: `$PROJECT_NAME`, `$DIR_TREE`, `$FILE_CONTENTS`, `$TOKEN_COUNT`, `$FILE_COUNT`, `$TIMESTAMP`

### WebView Sidebar
- Visual interface for easy configuration
- Quick scope selection (workspace/folder/selected files)
- Real-time token count display

## Keyboard Shortcuts

| Command | Windows/Linux | macOS |
|---------|---------------|-------|
| Generate for Workspace | `Ctrl+Shift+Alt+C` | `Cmd+Shift+Alt+C` |
| Generate for Folder | `Ctrl+Shift+Alt+F` | `Cmd+Shift+Alt+F` |
| Generate for Selected Files | `Ctrl+Shift+Alt+S` | `Cmd+Shift+Alt+S` |

## Quick Start

1. Install the extension
2. Open your project
3. Press `Ctrl+Shift+Alt+C` to generate context for your entire workspace
4. Paste into ChatGPT, Claude, or your preferred AI assistant

## Configuration

### Creating .aicontextignore

Create a `.aicontextignore` file in your project root:

```
node_modules/**
dist/**
*.min.js
*.min.css
.env
```

### Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aiContext.maxFileSize` | number | 51200 | File size threshold for outline mode (bytes) |
| `aiContext.maxTokens` | number | 128000 | Token warning threshold |
| `aiContext.defaultOutputTarget` | enum | clipboard | Output: clipboard, file, or preview |
| `aiContext.tokenEstimation` | enum | tiktoken | Counting method: tiktoken or simple |
| `aiContext.showTreeEmoji` | boolean | true | Show emoji in directory tree |

## Use Cases

- **Code Review**: Share relevant code context with AI for thorough review
- **Bug Investigation**: Provide structured context for debugging assistance
- **Documentation**: Generate project overviews for AI to create documentation
- **Code Explanation**: Help AI understand your codebase structure
- **Refactoring**: Share module structure for AI-assisted refactoring

## Example Output

```markdown
> 📊 **Context Statistics**
> - Total Tokens: ~15.2K / 128K
> - Files Included: 23 (2 as outline)
> - Generated at: 2025-03-30T12:34:56.789Z

# Project Structure

my-project/
├── src/
│   ├── index.ts
│   └── utils.ts
├── package.json
└── README.md

# File Contents

## src/index.ts

export function hello(name: string): string {
  return `Hello, ${name}!`;
}

## src/utils.ts

export const formatDate = (date: Date): string => { ... }
```

## Privacy

- All processing is done locally on your machine
- No data is sent to external servers
- No telemetry or analytics

## Links

- **GitHub**: https://github.com/suifei/ai-context-generator
- **Issues**: https://github.com/suifei/ai-context-generator/issues
- **License**: MIT

---

## 扩展描述 (中文)

从项目文件生成结构化 Markdown 上下文，用于 AI 助手交互。非常适合在与 ChatGPT、Claude、Copilot 或其他 AI 编码助手协作时准备代码上下文。

## 功能特性

### 智能文件过滤
- 支持 `.aicontextignore` 文件（与 `.gitignore` 语法相同）
- 预配置忽略 `node_modules`、`dist`、`build` 等常见构建产物

### 智能内容处理
- **代码文件**：语法高亮显示完整内容
- **大文件**（>50KB）：基于 AST 的结构大纲（支持 TS、Python、Go、Rust、Java、C/C++）
- **日志文件**：级别分布和错误模式采样
- **CSV/TSV 文件**：模式推断和数据采样
- **配置文件**（JSON/YAML）：结构骨架及敏感数据脱敏
- **二进制文件**：元数据提取

### 灵活输出
- **剪贴板**：快速复制粘贴到 AI 对话
- **文件**：保存为 Markdown 文件供后续使用
- **预览**：在 VSCode 中打开预览

### 快捷键

| 命令 | Windows/Linux | macOS |
|------|---------------|-------|
| 为工作区生成 | `Ctrl+Shift+Alt+C` | `Cmd+Shift+Alt+C` |
| 为文件夹生成 | `Ctrl+Shift+Alt+F` | `Cmd+Shift+Alt+F` |
| 为选中文件生成 | `Ctrl+Shift+Alt+S` | `Cmd+Shift+Alt+S` |

## 隐私

- 所有处理在本地完成
- 不向外部服务器发送任何数据
- 无遥测或分析

## 链接

- **GitHub**: https://github.com/suifei/ai-context-generator
- **问题反馈**: https://github.com/suifei/ai-context-generator/issues
