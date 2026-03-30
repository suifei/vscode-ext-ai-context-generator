# AI Context Generator

[English](#english) | [简体中文](#简体中文)

---

## English

A VSCode extension that automatically generates structured Markdown context from project files for AI assistant interactions. Perfect for preparing code context when working with ChatGPT, Claude, Copilot, or other AI coding assistants.

![Version](https://img.shields.io/visual-studio-marketplace/v/suifei.ai-context-generator)
![Installs](https://img.shields.io/visual-studio-marketplace/i/suifei.ai-context-generator)
![Rating](https://img.shields.io/visual-studio-marketplace/r/suifei.ai-context-generator)

### Features

- **Smart File Filtering**: Supports `.aicontextignore` file (same syntax as `.gitignore`) to exclude unwanted files
- **Intelligent Content Processing**:
  - **Code files**: Syntax highlighting with full content
  - **Large files** (>50KB): AST-based structure outline for TypeScript, Python, Go, Rust, Java, C/C++
  - **Log files**: Level distribution and error pattern sampling
  - **CSV/TSV files**: Schema inference and data sampling
  - **Config files** (JSON/YAML): Structure skeleton with sensitive data redaction
  - **Binary files**: Metadata extraction (dimensions, duration, format)
- **Flexible Output**: Clipboard, file, or preview pane
- **Token Counting**: Accurate counting with tiktoken or lightweight estimation
- **Custom Templates**: Create reusable templates with placeholder variables
- **Smart Context Detection**: Directory tree starts from selected folder, not always workspace root

### Installation

1. Open VSCode
2. Press `Ctrl+Shift+X` (Cmd+Shift+X on Mac) to open Extensions
3. Search for "AI Context Generator"
4. Click Install

Or install from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=suifei.ai-context-generator)

### Usage

#### Right-Click Menu

Right-click on any file or folder in the Explorer for direct access:
- **Generate AI Context to Clipboard** - Copy result to clipboard
- **Generate AI Context to File** - Save to workspace root (`ai-context.md`)
- **Generate AI Context to Preview** - Open in new editor tab

The command intelligently handles:
- **Single file**: Generates context for that file only
- **Single folder**: Generates context for that folder and its subfolders (tree starts from that folder)
- **Multiple selection**: Generates context for all selected items

#### Command Palette

Open with `Ctrl+Shift+P` (Cmd+Shift+P on Mac) and type:
- `AI Context Generator: Generate AI Context` - Shows output picker
- `AI Context Generator: Generate to Clipboard` - Direct clipboard output
- `AI Context Generator: Generate to File` - Direct file output
- `AI Context Generator: Generate to Preview` - Direct preview

This uses the currently active editor file.

#### Configuration Submenu

Access additional options via the submenu:
- **Open AI Context Generator Logs** - View debug logs
- **Configure AI Context Generator** - Quick settings access

### Configuration

Create a `.aicontextignore` file in your project root (same syntax as `.gitignore`):

```
node_modules/**
dist/**
*.min.js
*.min.css
```

#### Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aiContext.maxFileSize` | number | 51200 | Maximum file size in bytes before showing outline/summary (50KB) |
| `aiContext.maxTokens` | number | 128000 | Token limit warning threshold for local counting (does NOT call any AI API) |
| `aiContext.outputFileName` | string | ai-context.md | Output filename when saving to workspace root |
| `aiContext.tokenEstimation` | enum | tiktoken | Token counting method |
| `aiContext.showTreeEmoji` | boolean | true | Show emoji markers in directory tree |
| `aiContext.logLevel` | enum | info | Log level for output channel (debug/info/warn/error) |
| `aiContext.outlineDetail` | enum | standard | Outline detail level (basic/standard/detailed) |
| `aiContext.outlineIncludePrivate` | boolean | false | Include private members in outline |
| `aiContext.outlineExtractComments` | boolean | true | Extract comments and docstrings in outline |
| `aiContext.outlineMaxItems` | number | 50 | Maximum items per section in outline |
| `aiContext.sensitiveKeyPatterns` | array | [...] | Patterns for detecting sensitive keys (auto-filtered for security) |
| `aiContext.ignorePatterns` | array | [...] | Glob patterns to ignore (combined with .aicontextignore) |

### Template Variables

Custom templates support these variables:

| Variable | Description |
|----------|-------------|
| `$PROJECT_NAME` | Selected folder or workspace folder name |
| `$DIR_TREE` | ASCII directory tree with emoji |
| `$FILE_LIST` | List of all file paths |
| `$FILE_CONTENTS` | Formatted file contents |
| `$TOKEN_COUNT` | Total token count |
| `$TOKEN_LIMIT` | Configured limit |
| `$FILE_COUNT` | Number of files |
| `$OUTLINE_COUNT` | Files shown as outline |
| `$TIMESTAMP` | ISO 8601 timestamp |

### Example Output

```markdown
> 📊 **Context Statistics**
> - Total Tokens: ~15.2K / 128K
> - Files Included: 23 (2 as outline)
> - Generated at: 2026-03-30T12:34:56.789Z

# Project Structure

 src/
 ├── 📄 index.ts
 └── 📄 utils.ts
 ├── 📄 package.json
 └── 📄 README.md

# File Contents

// File: src/index.ts (1.2KB)
export function hello(name: string): string {
  return `Hello, ${name}!`;
}

```

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### License

MIT

### Links

- [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=suifei.ai-context-generator)
- [GitHub Repository](https://github.com/suifei/ai-context-generator)
- [Report Issues](https://github.com/suifei/ai-context-generator/issues)

---

## 简体中文

一个 VSCode 扩展，可自动从项目文件生成结构化的 Markdown 上下文，用于 AI 助手交互。非常适合在与 ChatGPT、Claude、Copilot 或其他 AI 编码助手协作时准备代码上下文。

![版本](https://img.shields.io/visual-studio-marketplace/v/suifei.ai-context-generator)
![安装量](https://img.shields.io/visual-studio-marketplace/i/suifei.ai-context-generator)
![评分](https://img.shields.io/visual-studio-marketplace/r/suifei.ai-context-generator)

### 功能特性

- **智能文件过滤**：支持 `.aicontextignore` 文件（与 `.gitignore` 语法相同）以排除不需要的文件
- **智能内容处理**：
  - **代码文件**：语法高亮显示完整内容
  - **大文件**（>50KB）：基于 AST 的结构大纲（支持 TypeScript、Python、Go、Rust、Java、C/C++）
  - **日志文件**：级别分布和错误模式采样
  - **CSV/TSV 文件**：模式推断和数据采样
  - **配置文件**（JSON/YAML）：结构骨架及敏感数据脱敏
  - **二进制文件**：元数据提取（尺寸、时长、格式）
- **灵活输出**：剪贴板、文件或预览窗格
- **Token 计数**：使用 tiktoken 精确计数或轻量级估算
- **自定义模板**：创建带有占位符变量的可重用模板
- **智能上下文检测**：目录树从选中的文件夹开始，而非始终从工作区根目录

### 安装

1. 打开 VSCode
2. 按 `Ctrl+Shift+X`（Mac 上为 `Cmd+Shift+X`）打开扩展面板
3. 搜索 "AI Context Generator"
4. 点击安装

或从 [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=suifei.ai-context-generator) 安装

### 使用方法

#### 右键菜单

在资源管理器中右键点击任何文件或文件夹，可直接选择：
- **生成 AI 上下文到剪切板** - 复制结果到剪切板
- **生成 AI 上下文到文件** - 保存到工作区根目录（`ai-context.md`）
- **生成 AI 上下文到预览窗口** - 在新编辑器标签页中打开

命令智能处理：
- **单个文件**：仅生成该文件的上下文
- **单个文件夹**：生成该文件夹及其子文件夹的上下文（目录树从该文件夹开始）
- **多选**：生成所有选中项目的上下文

#### 命令面板

使用 `Ctrl+Shift+P`（Mac 上为 `Cmd+Shift+P`）打开并输入：
- `AI 上下文生成器: 生成 AI 上下文` - 显示输出选择器
- `AI 上下文生成器: 生成到剪切板` - 直接输出到剪切板
- `AI 上下文生成器: 生成到文件` - 直接输出到文件
- `AI 上下文生成器: 生成到预览窗口` - 直接预览

这将使用当前活动编辑器文件。

#### 配置子菜单

通过子菜单访问更多选项：
- **打开 AI 上下文生成器日志** - 查看调试日志
- **配置 AI 上下文生成器** - 快速设置访问

### 配置

在项目根目录创建 `.aicontextignore` 文件（与 `.gitignore` 语法相同）：

```
node_modules/**
dist/**
*.min.js
*.min.css
```

#### 设置

| 设置 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `aiContext.maxFileSize` | number | 51200 | 显示大纲/摘要前的最大文件大小（字节，默认 50KB） |
| `aiContext.maxTokens` | number | 128000 | 本地 Token 计数警告阈值（不会调用任何 AI 接口） |
| `aiContext.outputFileName` | string | ai-context.md | 保存到工作区根目录时的输出文件名 |
| `aiContext.tokenEstimation` | enum | tiktoken | Token 计数方法 |
| `aiContext.showTreeEmoji` | boolean | true | 在目录树中显示 emoji 标记 |
| `aiContext.logLevel` | enum | info | 输出通道的日志级别（debug/info/warn/error） |
| `aiContext.outlineDetail` | enum | standard | 大纲详细级别（basic/standard/detailed） |
| `aiContext.outlineIncludePrivate` | boolean | false | 在大纲中包含私有成员 |
| `aiContext.outlineExtractComments` | boolean | true | 在大纲中提取注释和文档字符串 |
| `aiContext.outlineMaxItems` | number | 50 | 大纲中每个部分的最大项目数 |
| `aiContext.sensitiveKeyPatterns` | array | [...] | 检测敏感键的模式（为安全自动过滤） |
| `aiContext.ignorePatterns` | array | [...] | 要忽略的 glob 模式（与 .aicontextignore 结合使用） |

### 模板变量

自定义模板支持以下变量：

| 变量 | 描述 |
|------|------|
| `$PROJECT_NAME` | 选中的文件夹或工作区文件夹名称 |
| `$DIR_TREE` | 带 emoji 的 ASCII 目录树 |
| `$FILE_LIST` | 所有文件路径列表 |
| `$FILE_CONTENTS` | 格式化的文件内容 |
| `$TOKEN_COUNT` | 总 Token 计数 |
| `$TOKEN_LIMIT` | 配置的限制 |
| `$FILE_COUNT` | 文件数量 |
| `$OUTLINE_COUNT` | 显示为大纲的文件数 |
| `$TIMESTAMP` | ISO 8601 时间戳 |

### 输出示例

```markdown
> 📊 **上下文统计**
> - 总 Token：~15.2K / 128K
> - 包含文件：23 个（2 个为大纲）
> - 生成时间：2026-03-30T12:34:56.789Z

# 项目结构

 src/
 ├── 📄 index.ts
 └── 📄 utils.ts
 ├── 📄 package.json
 └── 📄 README.md

# 文件内容

// 文件：src/index.ts (1.2KB)
export function hello(name: string): string {
  return `Hello, ${name}!`;
}

```

### 贡献

欢迎贡献！请随时提交 Pull Request。

### 许可证

MIT

### 链接

- [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=suifei.ai-context-generator)
- [GitHub 仓库](https://github.com/suifei/ai-context-generator)
- [报告问题](https://github.com/suifei/ai-context-generator/issues)
