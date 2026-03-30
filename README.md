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
- **WebView Sidebar**: Visual interface for easy configuration and generation

### Installation

1. Open VSCode
2. Press `Ctrl+Shift+X` (Cmd+Shift+X on Mac) to open Extensions
3. Search for "AI Context Generator"
4. Click Install

Or install from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=your-publisher-name.ai-context-generator)

### Usage

#### Keyboard Shortcuts

| Command | Windows/Linux | macOS |
|---------|---------------|-------|
| Generate for Workspace | `Ctrl+Shift+Alt+C` | `Cmd+Shift+Alt+C` |
| Generate for Folder | `Ctrl+Shift+Alt+F` | `Cmd+Shift+Alt+F` |
| Generate for Selected | `Ctrl+Shift+Alt+S` | `Cmd+Shift+Alt+S` |

#### Commands

- `AI Context Generator: Generate AI Context for Workspace` - Generate context for entire workspace
- `AI Context Generator: Generate AI Context for Current Folder` - Generate context for current folder
- `AI Context Generator: Generate AI Context for Selected Files` - Generate context for selected files
- `AI Context Generator: Open AI Context Sidebar` - Open the sidebar panel
- `AI Context Generator: Open Logs` - Open the output panel to view logs

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
| `aiContext.maxTokens` | number | 128000 | Token limit warning threshold |
| `aiContext.defaultOutputTarget` | enum | clipboard | Default output destination (clipboard/file/preview) |
| `aiContext.tokenEstimation` | enum | tiktoken | Token counting method |
| `aiContext.showTreeEmoji` | boolean | true | Show emoji markers in directory tree |
| `aiContext.logLevel` | enum | info | Log level for output channel (debug/info/warn/error) |

### Template Variables

Custom templates support these variables:

| Variable | Description |
|----------|-------------|
| `$PROJECT_NAME` | Workspace folder name |
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
> - Generated at: 2025-03-30T12:34:56.789Z

# Project Structure

```
my-project/
├── 📄 src/
│   ├── 📄 index.ts
│   └── 📄 utils.ts
├── 📄 package.json
└── 📄 README.md
```

# File Contents

// File: src/index.ts (1.2KB)
```typescript
export function hello(name: string): string {
  return `Hello, ${name}!`;
}
```
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

![版本](https://img.shields.io/visual-studio-marketplace/v/your-publisher-name.ai-context-generator)
![安装量](https://img.shields.io/visual-studio-marketplace/i/your-publisher-name.ai-context-generator)
![评分](https://img.shields.io/visual-studio-marketplace/r/your-publisher-name.ai-context-generator)

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
- **WebView 侧边栏**：可视化界面，便于配置和生成

### 安装

1. 打开 VSCode
2. 按 `Ctrl+Shift+X`（Mac 上为 `Cmd+Shift+X`）打开扩展面板
3. 搜索 "AI Context Generator"
4. 点击安装

或从 [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=your-publisher-name.ai-context-generator) 安装

### 使用方法

#### 键盘快捷键

| 命令 | Windows/Linux | macOS |
|------|---------------|-------|
| 为工作区生成 | `Ctrl+Shift+Alt+C` | `Cmd+Shift+Alt+C` |
| 为文件夹生成 | `Ctrl+Shift+Alt+F` | `Cmd+Shift+Alt+F` |
| 为选中文件生成 | `Ctrl+Shift+Alt+S` | `Cmd+Shift+Alt+S` |

#### 命令

- `AI 上下文生成器: 为工作区生成 AI 上下文` - 为整个工作区生成上下文
- `AI 上下文生成器: 为当前文件夹生成 AI 上下文` - 为当前文件夹生成上下文
- `AI 上下文生成器: 为选中文件生成 AI 上下文` - 为选中文件生成上下文
- `AI 上下文生成器: 打开 AI 上下文侧边栏` - 打开侧边栏面板
- `AI 上下文生成器: 打开 AI 上下文生成器日志` - 打开输出面板查看日志

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
| `aiContext.maxTokens` | number | 128000 | Token 限制警告阈值 |
| `aiContext.defaultOutputTarget` | enum | clipboard | 默认输出目标（clipboard/file/preview） |
| `aiContext.tokenEstimation` | enum | tiktoken | Token 计数方法 |
| `aiContext.showTreeEmoji` | boolean | true | 在目录树中显示 emoji 标记 |
| `aiContext.logLevel` | enum | info | 输出通道的日志级别（debug/info/warn/error） |

### 模板变量

自定义模板支持以下变量：

| 变量 | 描述 |
|------|------|
| `$PROJECT_NAME` | 工作区文件夹名称 |
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
> - 生成时间：2025-03-30T12:34:56.789Z

# 项目结构

```
my-project/
├── 📄 src/
│   ├── 📄 index.ts
│   └── 📄 utils.ts
├── 📄 package.json
└── 📄 README.md
```

# 文件内容

// 文件：src/index.ts (1.2KB)
```typescript
export function hello(name: string): string {
  return `Hello, ${name}!`;
}
```
```

### 贡献

欢迎贡献！请随时提交 Pull Request。

### 许可证

MIT

### 链接

- [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=suifei.ai-context-generator)
- [GitHub 仓库](https://github.com/suifei/ai-context-generator)
- [报告问题](https://github.com/suifei/ai-context-generator/issues)
