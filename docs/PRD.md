# PRD - AI Context Generator 产品需求

## 产品定位

VSCode 扩展，将项目代码转换为结构化 Markdown 上下文，用于 AI 助手交互。

**核心价值**: 一键生成带语法高亮的代码上下文，直接粘贴给 ChatGPT/Claude/Copilot。

---

## 功能规格

### 1. 触发入口

| 入口 | 命令 | 行为 |
|------|------|------|
| 右键菜单 | `aiContext.generate.clipboard` | 复制到剪贴板 |
| 右键菜单 | `aiContext.generate.file` | 保存为文件 |
| 右键菜单 | `aiContext.generate.preview` | 新标签页预览 |
| 右键菜单 | `aiContext.submenu.config` | 配置子菜单 |
| 命令面板 | `aiContext.generate` | 显示输出选择器 |
| 命令面板 | `aiContext.openLogs` | 打开日志面板 |
| 命令面板 | `aiContext.configure` | 快速配置 |
| 命令面板 | `aiContext.toggleLargeFileDegradation` | 切换大文件降级 |
| 命令面板 | `aiContext.generate.ignoreFile` | 生成忽略文件 |

**输入支持**:
- 单文件: 生成该文件上下文
- 单文件夹: 生成该文件夹及其子目录
- 多选: 生成所有选中项

---

### 2. 文件过滤策略

**过滤优先级**（从高到低）:
```
.gitignore（自动读取）
    ↓
.aicontextignore（项目级，用户生成）
    ↓
aiContext.ignorePatterns（全局配置）
    ↓
aiContext.binaryFilePatterns（内置）
```

**忽略文件生成**: 右键 → 配置子菜单 → "生成 .aicontextignore 配置文件"
- 自动合并项目 `.gitignore`
- 去重后写入 `.aicontextignore`

---

### 3. 文件内容处理决策树

```
fs.statSync() → 获取文件大小
    ↓
size > maxFileSize AND enableLargeFileDegradation?
    ↓ Yes                              ↓ No
语言支持 AST?                        isBinaryFile()
    ↓ Yes        ↓ No                    ↓ Yes    ↓ No
大纲提取      智能摘要              元数据    完整内容
```

**大文件降级开关**: `enableLargeFileDegradation`（默认 true）
- 开启: `>50KB` 触发降级
- 关闭: 全文读取

---

### 4. AST 大纲提取

**支持语言**: TypeScript, JavaScript, Python, Go, Rust, Java, C/C++

**配置项**:

| 配置 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `outlineDetail` | enum | standard | basic/standard/detailed |
| `outlineIncludePrivate` | boolean | false | 包含私有成员 |
| `outlineExtractComments` | boolean | true | 提取注释和文档字符串 |
| `outlineMaxItems` | number | 50 | 每节最大条目（10-200） |

**降级策略**: LSP DocumentSymbol → LSP SymbolInformation → Regex

---

### 5. 智能摘要分析器

| 扩展名 | Analyzer | 输出 |
|--------|----------|------|
| `.log` | LogAnalyzer | 日志级别分布、错误采样（`logSampleLines` 行） |
| `.csv`, `.tsv` | CsvAnalyzer | 模式推断、类型检测（`csvSampleRows` 行） |
| `.json`, `.yaml`, `.yml`, `.xml` | ConfigAnalyzer | 结构骨架、敏感数据脱敏 |
| `.md`, `.txt` | DocAnalyzer | 标题大纲、关键词提取 |
| 其他 | GenericAnalyzer | 代码结构、文本预览 |

---

### 6. 二进制文件处理

**检测方式**:
1. 扩展名匹配 (`binaryFilePatterns`)
2. 无扩展名 → 读取前 1KB 检查 null 字节

**输出**: 元数据提取（尺寸、格式、时长等）

**内置二进制模式**:
```
*.png, *.jpg, *.jpeg, *.gif, *.webp, *.ico, *.bmp, *.svg
*.mp3, *.mp4, *.wav, *.avi, *.mov
*.zip, *.tar, *.gz
*.exe, *.dll, *.so, *.dylib
*.woff, *.woff2, *.ttf, *.eot
*.bin, *.dat
```

---

### 7. 输出目标

| 目标 | 配置项 | 默认值 | 行为 |
|------|--------|--------|------|
| 剪贴板 | - | - | 直接复制 |
| 文件 | `outputFileName` | ai-context.md | 覆盖需确认，自动打开 |
| 预览 | - | - | 新编辑器标签页 |

---

### 8. 自定义模板

**模板目录**: `.ai_context_templates/`

**可用变量**:

| 变量 | 说明 |
|------|------|
| `$PROJECT_NAME` | 项目名称 |
| `$DIR_TREE` | 目录树（`showTreeEmoji` 控制 emoji） |
| `$FILE_LIST` | 文件路径列表 |
| `$FILE_CONTENTS` | 文件内容 |
| `$TOKEN_COUNT` | Token 计数 |
| `$TOKEN_LIMIT` | Token 限制 |
| `$FILE_COUNT` | 文件数量 |
| `$OUTLINE_COUNT` | 大纲文件数 |
| `$TIMESTAMP` | ISO 8601 时间戳 |
| `$SELECTED_FILES` | 选中的文件 |
| `$SCOPE` | 作用域（selected/workspace） |
| `$WORKSPACE_PATH` | 工作区路径 |

**模板选择**: `defaultTemplate` 配置项（默认 "default"）

---

## 配置项完整列表

### 文件处理

| 配置键 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `maxFileSize` | number | 51200 | 触发降级的文件大小阈值（字节） |
| `maxTokens` | number | 128000 | Token 警告阈值（本地计数） |
| `enableLargeFileDegradation` | boolean | true | 大文件降级开关 |
| `parallelFileReads` | number | 50 | 并发读取批次 |

### 摘要分析

| 配置键 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `textPreviewLength` | number | 300 | 文本预览长度 |
| `logSampleLines` | number | 5 | 日志采样行数 |
| `csvSampleRows` | number | 3 | CSV 采样行数 |
| `sensitiveKeyPatterns` | array | [...] | 敏感键检测模式 |

### 大纲提取

| 配置键 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `outlineDetail` | enum | standard | basic/standard/detailed |
| `outlineIncludePrivate` | boolean | false | 包含私有成员 |
| `outlineExtractComments` | boolean | true | 提取注释 |
| `outlineMaxItems` | number | 50 | 每节最大条目（10-200） |

### 过滤

| 配置键 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `ignorePatterns` | array | [...] | 全局忽略模式 |
| `binaryFilePatterns` | array | [...] | 二进制文件模式 |

### 输出

| 配置键 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `outputFileName` | string | ai-context.md | 输出文件名 |
| `defaultTemplate` | string | default | 模板名称 |
| `showTreeEmoji` | boolean | true | 目录树显示 emoji |
| `tokenEstimation` | enum | tiktoken | Token 计数方法 |

### 其他

| 配置键 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `autoDetectLanguage` | boolean | true | 自动检测语言 |
| `logLevel` | enum | info | 日志级别（debug/info/warn/error） |

---

## 默认配置值

```json
{
  "maxFileSize": 51200,
  "maxTokens": 128000,
  "textPreviewLength": 300,
  "logSampleLines": 5,
  "csvSampleRows": 3,
  "defaultTemplate": "default",
  "sensitiveKeyPatterns": [
    "password", "passwd", "secret", "token",
    "api_key", "apikey", "private_key", "credential"
  ],
  "autoDetectLanguage": true,
  "ignorePatterns": [
    "node_modules/**", "build/**", ".git/**",
    "coverage/**", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"
  ],
  "binaryFilePatterns": [
    "*.png", "*.jpg", "*.jpeg", "*.gif", "*.webp",
    "*.ico", "*.bmp", "*.svg", "*.mp3", "*.mp4",
    "*.wav", "*.avi", "*.mov", "*.zip", "*.tar",
    "*.gz", "*.exe", "*.dll", "*.so", "*.dylib",
    "*.woff", "*.woff2", "*.ttf", "*.eot", "*.bin", "*.dat"
  ],
  "outputFileName": "ai-context.md",
  "showTreeEmoji": true,
  "tokenEstimation": "tiktoken",
  "parallelFileReads": 50,
  "outlineDetail": "standard",
  "outlineIncludePrivate": false,
  "outlineExtractComments": true,
  "outlineMaxItems": 50,
  "enableLargeFileDegradation": true
}
```
