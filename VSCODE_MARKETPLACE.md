# AI Context Generator (Advanced) - VSCode Marketplace Description

## Extension Description (English)

Generate structured Markdown context from your project files for AI assistant interactions. Perfect for preparing code context when working with ChatGPT, Claude, Copilot, or other AI coding assistants.

## Features

### Smart File Filtering
- Supports `.aicontextignore` file (same syntax as `.gitignore`) to exclude unwanted files
- Pre-configured to ignore `node_modules`, `build`, `.git`, and other common files

### Intelligent Content Processing
- **Code files**: Full content with syntax highlighting
- **Large files** (>50KB): TypeScript/JavaScript use Compiler API **function-level semantic summaries** first; other languages use LSP/symbol structure outline (Python, Go, Rust, Java, C/C++)
- **Log files**: Level distribution and error pattern sampling
- **CSV/TSV files**: Schema inference and data sampling
- **Config files** (JSON/YAML): Structure skeleton with sensitive data redaction (passwords, tokens, API keys)
- **Binary files**: Metadata extraction (dimensions, duration, format)

### Flexible Output Options
- **Clipboard**: Quick copy to paste into AI chat
- **File**: Save as Markdown file to workspace root (auto-opens after save)
- **Preview**: Open in VSCode for review before using

### Token Management
- Accurate token counting using tiktoken (GPT-4 compatible)
- Configurable warning threshold (default: 128K tokens)
- Lightweight estimation mode available

### Customizable Templates
- Built-in default template
- Support for custom templates in `.ai_context_templates/` directory
- Template variables: `$PROJECT_NAME`, `$DIR_TREE`, `$FILE_CONTENTS`, `$TOKEN_COUNT`, `$FILE_COUNT`, `$TIMESTAMP`

## Quick Start

1. Install the extension
2. Right-click on any file or folder in Explorer
3. Select an output option:
   - **Generate AI Context to Clipboard** - Copy directly
   - **Generate AI Context to File** - Save to workspace root
   - **Generate AI Context to Preview** - Open in new tab
4. Paste into ChatGPT, Claude, or your preferred AI assistant

## Configuration

### Creating .aicontextignore

Create a `.aicontextignore` file in your project root:

```
node_modules/**
build/**
*.min.js
.env
```

### Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aiContext.maxFileSize` | number | 51200 | File size threshold for outline mode (bytes) |
| `aiContext.maxTokens` | number | 128000 | Token warning threshold for local counting (does NOT call any AI API) |
| `aiContext.outputFileName` | string | ai-context.md | Output filename when saving to workspace root |
| `aiContext.tokenEstimation` | enum | tiktoken | Counting method: tiktoken or simple |
| `aiContext.showTreeEmoji` | boolean | true | Show emoji in directory tree |
| `aiContext.sensitiveKeyPatterns` | array | [...] | Patterns for detecting sensitive keys (auto-filtered for security) |
| `aiContext.ignorePatterns` | array | [...] | Additional ignore patterns |
| `aiContext.binaryFilePatterns` | array | [...] | Binary metadata summary patterns |

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
> - Generated at: 2026-03-30T12:34:56.789Z

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

- **GitHub**: https://github.com/suifei/vscode-ext-ai-context-generator
- **Issues**: https://github.com/suifei/vscode-ext-ai-context-generator/issues
- **License**: MIT

---

## 扩展描述 (中文)

从项目文件生成结构化 Markdown 上下文，用于 AI 助手交互。非常适合在与 ChatGPT、Claude、Copilot 或其他 AI 编码助手协作时准备代码上下文。

## 功能特性

### 智能文件过滤
- 支持 `.aicontextignore` 文件（与 `.gitignore` 语法相同）
- 预配置忽略 `node_modules`、`build`、`.git` 等常见文件

### 智能内容处理
- **代码文件**：语法高亮显示完整内容
- **大文件**（>50KB）：TS/JS 优先使用 Compiler API 的**函数级语义摘要**；其余语言使用 LSP/符号结构大纲（Python、Go、Rust、Java、C/C++）
- **日志文件**：级别分布和错误模式采样
- **CSV/TSV 文件**：模式推断和数据采样
- **配置文件**（JSON/YAML）：结构骨架及敏感数据脱敏
- **二进制文件**：元数据提取

### 灵活输出
- **剪贴板**：快速复制粘贴到 AI 对话
- **文件**：保存到工作区根目录（保存后自动打开）
- **预览**：在 VSCode 中打开预览

## 快速开始

1. 安装扩展
2. 在资源管理器中右键点击任意文件或文件夹
3. 选择输出选项：
   - **生成 AI 上下文到剪切板** - 直接复制
   - **生成 AI 上下文到文件** - 保存到工作区根目录
   - **生成 AI 上下文到预览窗口** - 在新标签页打开
4. 粘贴到 ChatGPT、Claude 或您偏好的 AI 助手

## 配置

### 创建 .aicontextignore

在项目根目录创建 `.aicontextignore` 文件：

```
node_modules/**
build/**
*.min.js
.env
```

### 设置

| 设置 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `aiContext.maxFileSize` | number | 51200 | 大纲模式文件大小阈值（字节） |
| `aiContext.maxTokens` | number | 128000 | 本地 Token 计数警告阈值（不会调用任何 AI 接口） |
| `aiContext.outputFileName` | string | ai-context.md | 保存到工作区根目录的文件名 |
| `aiContext.tokenEstimation` | enum | tiktoken | 计数方法：tiktoken 或 simple |
| `aiContext.showTreeEmoji` | boolean | true | 在目录树中显示 emoji |
| `aiContext.sensitiveKeyPatterns` | array | [...] | 检测敏感键的模式（为安全自动过滤） |
| `aiContext.ignorePatterns` | array | [...] | 额外的忽略模式 |
| `aiContext.binaryFilePatterns` | array | [...] | 二进制元数据摘要模式 |

## 隐私

- 所有处理在本地完成
- 不向外部服务器发送任何数据
- 无遥测或分析

## 链接

- **GitHub**: https://github.com/suifei/vscode-ext-ai-context-generator
- **问题反馈**: https://github.com/suifei/vscode-ext-ai-context-generator/issues
