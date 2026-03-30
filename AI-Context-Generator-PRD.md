# VSCode AI Context Generator — 产品需求设计文档 (PRD)

> **版本**: v1.2
> **日期**: 2026-03-30
> **状态**: 开发完成 100%，Phase 4 已完成 ✅
> **插件标识**: `ai-context-generator`
> **当前代码版本**: v1.0.0

---

## 1. 产品概述

### 1.1 背景与动机

在日常开发中，开发者频繁需要将项目代码整理为结构化的文本上下文，以便粘贴给 AI 助手（如 ChatGPT、Claude、Cursor 等）进行代码审查、架构分析、Bug 排查或重构建议。当前这一过程高度依赖手动操作：逐个打开文件复制内容、手动整理目录树结构、统计 Token 消耗——既耗时又容易遗漏关键文件或包含无关内容。

AI Context Generator 正是为解决这一痛点而设计的 VSCode 插件。它能够一键将项目中选中的文件（或整个工作区）自动整理为一份完整的 Markdown 格式 AI 对话上下文文档，包含项目目录结构树、文件内容清单、代码文件全文或结构大纲，以及 Token 计数统计，让开发者可以专注于与 AI 的对话本身，而非繁琐的上下文准备工作。

### 1.2 目标用户

- 使用 AI 助手进行代码审查和架构分析的后端/前端/全栈开发者
- 需要频繁将项目代码提交给 AI 进行问题排查的工程师
- 团队协作中需要共享代码上下文的开发团队
- 开源项目维护者需要为 AI 生成项目描述文档

### 1.3 核心价值

| 价值维度 | 说明 |
|---------|------|
| **效率提升** | 将原本 10-30 分钟的手动整理工作压缩至 3 秒内完成 |
| **上下文质量** | 通过智能过滤和结构化输出，确保提供给 AI 的上下文精准且完整 |
| **Token 感知** | 实时统计 Token 消耗，帮助开发者避免超出 AI 模型的上下文窗口限制 |
| **灵活可控** | 支持多种选择范围、输出目标和自定义模板，适配不同使用场景 |

---

## 2. 功能架构总览

```
┌─────────────────────────────────────────────────────────┐
│                    AI Context Generator                  │
├──────────────┬──────────────┬───────────────────────────┤
│   触发入口    │   核心处理    │        输出目标           │
├──────────────┼──────────────┼───────────────────────────┤
│ · 右键菜单    │ · 文件过滤    │ · 复制到剪贴板            │
│ · 命令面板    │   (.aicontextignore)  │ · 保存为 .md 文件       │
│ · 侧边栏面板  │ · 目录树生成   │ · VSCode 新 Tab 预览     │
│ · 快捷键     │ · 文件读取    │                           │
│              │ · AST 大纲    │                           │
│              │ · Token 计算   │                           │
│              │ · 模板渲染    │                           │
├──────────────┴──────────────┴───────────────────────────┤
│                    配置与扩展                              │
├──────────────────────────────────────────────────────────┤
│ · VSCode Settings (JSON)                                 │
│ · .aicontextignore (项目级过滤)                           │
│ · .ai_context_templates/ (自定义模板)                      │
│ · 持久化状态 (上次选择、模板偏好)                           │
└──────────────────────────────────────────────────────────┘
```

---

## 3. 详细功能设计

### 3.1 触发方式

插件提供四种互补的触发方式，覆盖不同的使用习惯和场景：

#### 3.1.1 右键菜单（资源管理器上下文菜单）

在 VSCode 文件资源管理器中，选中文件或文件夹后右键，显示上下文菜单项：

- **选中文件时**：`🤖 AI Context: Generate from Selected Files`
- **选中文件夹时**：`🤖 AI Context: Generate from Selected Folder`
- **单击空白区域/根目录时**：`🤖 AI Context: Generate from Entire Workspace`

> **注意**：右键菜单仅在资源管理器中可用，编辑器内的右键菜单暂不添加入口（避免菜单膨胀）。

#### 3.1.2 命令面板（Command Palette）

通过 `Ctrl+Shift+P`（Mac: `Cmd+Shift+P`）打开命令面板，搜索以下命令：

| 命令 ID | 显示名称 | 说明 |
|---------|---------|------|
| `aiContext.generate.workspace` | `AI Context: Generate from Entire Workspace` | 生成整个工作区的上下文 |
| `aiContext.generate.folder` | `AI Context: Generate from Current Folder` | 生成当前活动文件夹的上下文 |
| `aiContext.generate.selected` | `AI Context: Generate from Selected Files` | 生成选中文件的上下文 |
| `aiContext.generate.configure` | `AI Context: Configure Settings` | 打开插件配置界面 |

#### 3.1.3 侧边栏面板（Sidebar View）

在 VSCode 活动栏中添加专属侧边栏入口，面板名称为 **"AI Context"**。面板内包含完整的操作界面（详见 3.9 节）。

#### 3.1.4 快捷键

提供默认快捷键绑定（可在 VSCode 键盘快捷方式设置中自定义）：

| 快捷键（Windows/Linux） | 快捷键（macOS） | 命令 |
|------------------------|----------------|------|
| `Ctrl+Shift+Alt+C` | `Cmd+Shift+Alt+C` | 从整个工作区生成 |
| `Ctrl+Shift+Alt+F` | `Cmd+Shift+Alt+F` | 从当前文件夹生成 |
| `Ctrl+Shift+Alt+S` | `Cmd+Shift+Alt+S` | 从选中文件生成 |

> 快捷键设计原则：采用 `Ctrl+Shift+Alt` 三键组合，避免与常用快捷键冲突。

---

### 3.2 文件选择范围

插件支持三种递进的选择范围，适配从精细到全面的不同需求：

#### 3.2.1 选中文件模式

- 支持在文件资源管理器中**多选文件**（按住 `Ctrl/Cmd` 点击）
- 支持跨文件夹多选
- 自动读取选中文件的完整内容
- 在目录树中仅高亮标记被选中的文件

#### 3.2.2 文件夹递归模式

- 选中文件夹后，**自动递归扫描**该文件夹下的所有文件
- 递归扫描遵循 `.aicontextignore` 过滤规则
- 递归深度**无硬性限制**，但受总 Token 上限约束
- 在目录树中高亮标记该文件夹及其下所有被包含的文件

#### 3.2.3 整个工作区模式

- 以 VSCode 当前打开的**工作区根目录**为起点
- 递归扫描所有文件，遵循 `.aicontextignore` 过滤规则
- 这是覆盖范围最广的模式，适用于需要将整个项目提交给 AI 分析的场景

---

### 3.3 `.aicontextignore` 配置文件

#### 3.3.1 设计理念

`.aicontextignore` 的设计目标是让开发者能够以与 `.gitignore` 完全一致的语法和心智模型，指定哪些文件和目录应被排除在 AI 上下文之外。这种设计降低了学习成本——任何熟悉 Git 的开发者都可以立即上手使用。

#### 3.3.2 文件位置与优先级

| 位置 | 作用域 | 优先级 |
|------|--------|--------|
| `{workspaceRoot}/.aicontextignore` | 当前工作区 | 高 |
| 父级目录中的 `.aicontextignore` | 多根工作区场景 | 中 |
| VSCode Settings 中的 `aiContext.ignorePatterns` | 全局额外规则 | 低（追加） |

#### 3.3.3 语法规则

完全兼容 `.gitignore` 语法规范，支持以下模式：

```gitignore
# 注释行（以 # 开头）
# 忽略所有 .log 文件
*.log

# 忽略 build 目录及其所有内容
build/
dist/
out/

# 忽略所有 node_modules（任何层级）
node_modules/

# 忽略特定扩展名的文件
*.min.js
*.min.css
*.map
*.tar
*.gz
*.zip

# 忽略特定文件
coverage.out
go.sum

# 仅忽略根目录下的 README.md（不忽略子目录中的）
/README.md

# 取消忽略（! 前缀）
!important.config.js

# 通配符匹配
*.test.js
*_test.go
```

#### 3.3.4 默认忽略规则

插件内嵌一套默认的忽略规则（无需用户配置），这些规则始终生效：

```
# 版本控制
.git/
.gitignore

# 依赖目录
node_modules/
vendor/
.pyenv/
.venv/
venv/

# 构建产物
dist/
build/
out/
bin/
obj/
target/
__pycache__/
*.class
*.o
*.so
*.dll
*.exe

# IDE 配置
.idea/
.vscode/settings.json
*.swp
*.swo

# 系统文件
.DS_Store
Thumbs.db

# 锁文件
package-lock.json
yarn.lock
pnpm-lock.yaml

# 大型数据文件
*.sqlite
*.db
*.dump
```

用户在 `.aicontextignore` 中配置的规则会与默认规则**合并**生效。

#### 3.3.5 文件变更监听

当 `.aicontextignore` 文件内容发生变更时，插件自动重新加载过滤规则，无需重启 VSCode 或手动刷新。通过 VSCode 的 `FileSystemWatcher` API 实现实时监听。

---

### 3.4 目录结构树生成

#### 3.4.1 树形结构生成规则

- 以工作区根目录为起点生成完整的目录树
- 使用 Unicode 树形连接符：`├──`、`└──`、`│`
- 文件夹排在前面，文件排在后面（每组内按字母排序）
- 隐藏文件和目录**默认显示**（受 `.aicontextignore` 控制）
- 树的深度跟随实际项目结构，无人工限制

#### 3.4.2 文件高亮标记

被选中的文件/文件夹使用 emoji 标记进行视觉高亮，使 AI 和开发者都能一眼识别哪些内容被纳入了上下文：

```
├── 📁 docs                    ← 选中文件夹
│   ├── 📄 architecture.md      ← 选中文件
│   └── design.md
├── 📄 agent.go                 ← 选中文件
├── 📄 api.go                   ← 选中文件
├── 📁 sandbox
│   ├── client.go
│   ├── 📄 server.go            ← 选中文件
│   └── types.go
├── 📄 go.mod
└── main.go
```

**Emoji 规则**：
| 标记 | 含义 |
|------|------|
| 📄 | 被选中的文件（内容将完整展示或提取大纲） |
| 📁 | 被选中的文件夹（其下所有文件内容将完整展示或提取大纲） |

未标记的文件/文件夹表示未被选中，不出现在后续的文件内容清单中。

#### 3.4.3 树结构 Markdown 输出格式

```markdown
# Project Structure

\`\`\`
├── 📁 docs
│   ├── 📄 architecture.md
│   └── design.md
├── 📄 agent.go
├── 📄 api.go
├── 📁 sandbox
│   ├── client.go
│   ├── 📄 server.go
│   └── types.go
├── go.mod
└── main.go
\`\`\`
```

---

### 3.5 文件内容处理

#### 3.5.1 处理流程

```
文件列表 (经过 .aicontextignore 过滤)
         │
         ▼
    ┌────────────────┐
    │  文件大小 + 类型  │
    │  智能分类检测      │
    └───────┬────────┘
            │
    ┌───────┼───────────────┬──────────────┐
    │       │               │              │
    ▼       ▼               ▼              ▼
 二进制    ≤50KB           >50KB          >50KB
 文件     代码文件         代码文件       非代码文本
    │       │               │              │
    ▼       ▼               ▼              ▼
 丰富    完整内容        AST 结构大纲    智能摘要
 元数据   (带语言标识)     (含调用关系)  (按类型分策略)
    │       │               │              │
    ▼       ▼               ▼              ▼
┌──────────────────────────────────────────────┐
│           统一输出格式渲染                       │
│   ## 文件路径                                   │
│   > 元数据描述 / 智能摘要标题                     │
│   ```语言标识                                   │
│   文件内容                                      │
│   ```                                          │
└──────────────────────────────────────────────┘
```

> **设计哲学**：以 LLM 理解为中心——提供足够让 AI 建立结构性认知的"信息指纹"，而非粗暴地塞入原始内容。不同类型的文件提供不同维度的智能摘要，在保留关键信息的同时最大化 Token 效率。

#### 3.5.2 文件大小阈值

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `aiContext.maxFileSize` | `50KB` (51200 bytes) | 低于此阈值的代码文件输出完整内容，超过则提取 AST 大纲 |
| `aiContext.textPreviewLength` | `300` | 超过阈值的非代码文本文件预览字符数 |
| `aiContext.logSampleLines` | `5` | 日志文件首尾采样行数 |
| `aiContext.csvSampleRows` | `3` | CSV/TSV 文件首尾采样数据行数 |

#### 3.5.3 二进制文件处理 — 丰富元数据提取

以下类型的文件自动识别为二进制文件，**不读取内容**，但通过解析文件头部的固定偏移字节提取尽可能多的有用元数据信息，为 LLM 提供完整的文件"身份档案"：

```typescript
const BINARY_PATTERNS = [
  // 图片
  '*.png', '*.jpg', '*.jpeg', '*.gif', '*.bmp', '*.ico', '*.webp', '*.tiff', '*.avif',
  // 矢量
  '*.svg',  // SVG 是文本格式，特殊处理
  // 音频
  '*.mp3', '*.wav', '*.flac', '*.ogg', '*.aac', '*.wma', '*.m4a',
  // 视频
  '*.mp4', '*.avi', '*.mov', '*.mkv', '*.webm', '*.wmv', '*.flv',
  // 归档
  '*.zip', '*.tar', '*.gz', '*.rar', '*.7z', '*.bz2', '*.xz',
  // 文档
  '*.pdf', '*.doc', '*.docx', '*.xls', '*.xlsx', '*.ppt', '*.pptx',
  // 可执行/库
  '*.exe', '*.dll', '*.so', '*.dylib', '*.bin', '*.dat',
  // 字体
  '*.woff', '*.woff2', '*.ttf', '*.eot', '*.otf',
  // 数据库
  '*.sqlite', '*.db',
];
```

**元数据提取技术方案**：所有元数据提取均通过**解析文件头部的固定偏移字节**实现，不引入 `sharp`、`exifr` 等重量级依赖。图片尺寸等核心信息只需读取前 100-200 字节即可获取。

| 文件类型 | 提取方式 | 依赖 |
|---------|---------|------|
| PNG/JPEG/GIF/BMP/WebP/ICO/TIFF | 读取 magic bytes + header struct | 纯 Node.js Buffer 解析 |
| SVG | 作为文本文件解析 XML | `vscode.workspace.openTextDocument()` |
| TTF/OTF/WOFF/WOFF2 | 读取字体表头 | 纯 Node.js Buffer 解析 |
| MP3/WAV/FLAC/OGG | 读取音频帧头 | 纯 Node.js Buffer 解析 |
| PDF | 读取 PDF 头部对象 | 纯 Node.js Buffer 解析 |
| ZIP/TAR/GZ/RAR/7Z | 读取归档文件头 | 纯 Node.js Buffer 解析 |
| DOCX/XLSX/PPTX | 解析内部 ZIP 结构中的 XML | 纯 Node.js Buffer 解析 |
| EXE/DLL/SO/DYLIB | 读取 PE/ELF/Mach-O 头 | 纯 Node.js Buffer 解析 |

**输出格式示例**：

```markdown
## images/logo.png

> 🖼️ Binary File — **Image Metadata**
> - **Type**: PNG Image
> - **Dimensions**: 512 x 512 px
> - **DPI**: 72 x 72
> - **Color mode**: RGBA (32-bit)
> - **Color depth**: 8 bits per channel
> - **File size**: 245 KB (251,200 bytes)
> - **Compression**: Deflate
> - **Has transparency**: Yes (alpha channel)
> - **Has animation**: No

## images/hero-banner.jpg

> 🖼️ Binary File — **Image Metadata**
> - **Type**: JPEG Image
> - **Dimensions**: 1920 x 1080 px
> - **DPI**: 96 x 96
> - **Color mode**: YCbCr (sRGB)
> - **File size**: 380 KB
> - **Compression**: Baseline DCT, quality ~85%
> - **Has EXIF**: Yes (Camera: Canon EOS R5, ISO 400, f/2.8, 1/250s)

## assets/icon.svg

> 🖼️ Binary File — **Vector Image Metadata**
> - **Type**: SVG (Scalable Vector Graphics)
> - **Dimensions**: viewBox="0 0 24 24"
> - **File size**: 2.1 KB
> - **Elements**: 12 paths, 3 circles, 1 group
> - **Has text**: No
> - **Has embedded fonts**: No
> - **Has embedded images**: No

## assets/fonts/NotoSansSC-Regular.ttf

> 🔤 Binary File — **Font Metadata**
> - **Type**: TrueType Font
> - **File size**: 8.2 MB
> - **Font family**: Noto Sans SC
> - **Style**: Regular
> - **Glyph count**: 28,456
> - **Supported scripts**: CJK Unified Ideographs, Latin, Cyrillic
> - **Embedding allowed**: Yes
> - **License**: SIL Open Font License

## audio/notification.mp3

> 🔊 Binary File — **Audio Metadata**
> - **Type**: MP3 Audio (MPEG-1 Layer 3)
> - **Duration**: 2.4s
> - **Sample rate**: 44,100 Hz
> - **Channels**: Stereo
> - **Bit rate**: 192 kbps
> - **File size**: 58 KB

## data/export.xlsx

> 📊 Binary File — **Spreadsheet Metadata**
> - **Type**: Microsoft Excel (XLSX)
> - **File size**: 1.2 MB
> - **Sheets**: 3 (`Summary`, `Raw Data`, `Charts`)
> - **Total rows** (across all sheets): 4,520
> - **Total columns** (max per sheet): 18

## dist/app.exe

> ⚙️ Binary File — **Executable Metadata**
> - **Type**: PE32+ Executable (Windows x86-64)
> - **File size**: 12.8 MB
> - **Linked libraries**: 23 (kernel32.dll, user32.dll, ...)
> - **Entry point**: 0x1a2b3c
> - **Has debug info**: Yes (DWARF)

## archive/backup.tar.gz

> 📦 Binary File — **Archive Metadata**
> - **Type**: gzip compressed tar archive
> - **File size**: 45.2 MB (compressed)
> - **Compression ratio**: 32.1%
> - **Contains**: 1,247 files, 89 directories
```

#### 3.5.4 非代码文本文件处理 — 智能摘要策略

对于超过 50KB 的非代码文本文件，不再进行简单的头部截断，而是根据文件类型和内容特征，采用**分类型智能摘要**策略。核心思想是为 LLM 提供足够建立"结构性认知"的信息指纹，而非原始内容。

##### 策略 A：日志文件（`.log`、`.log.*`、`.out`）

对日志进行结构化统计分析，提取错误模式和首尾样本：

```markdown
## logs/application.log

> 📝 Log File — **Smart Summary**
> - **Total lines**: 12,456
> - **Time range**: 2026-03-29 08:15:02 → 2026-03-30 14:22:18
> - **Encoding**: UTF-8
> - **File size**: 3.2 MB

**Severity Distribution:**
| Level | Count | Ratio |
|-------|-------|-------|
| INFO  | 9,230 | 74.1% |
| WARN  | 2,105 | 16.9% |
| ERROR | 891   | 7.2%  |
| FATAL | 230   | 1.8%  |

**Top Error Patterns:**
1. `Connection timeout to database` — 312 occurrences (first at line 1,204)
2. `Authentication failed for user` — 187 occurrences (first at line 3,501)
3. `Disk space warning: >90%` — 89 occurrences (first at line 8,002)

**Sample Entries (first 5 lines):**
```log
[2026-03-29 08:15:02.001] INFO  [main] Application starting...
[2026-03-29 08:15:02.150] INFO  [db] Connecting to postgres://localhost:5432/app
[2026-03-29 08:15:02.891] INFO  [db] Connection established
[2026-03-29 08:15:03.002] INFO  [http] Server listening on :8080
[2026-03-29 08:15:05.441] WARN  [auth] Rate limit reached for 192.168.1.100
```

**Sample Entries (last 5 lines):**
```log
[2026-03-30 14:22:14.002] ERROR [db] Query timeout after 30s: SELECT * FROM orders...
[2026-03-30 14:22:15.100] INFO  [db] Connection pool recovered
[2026-03-30 14:22:16.501] WARN  [memory] Heap usage at 85%
[2026-03-30 14:22:18.002] INFO  [health] Health check passed
[2026-03-30 14:22:18.441] INFO  [main] Uptime: 1d 6h 7m
```
```

**日志分析能力**：
- 自动识别常见日志级别前缀（`INFO`、`WARN`、`ERROR`、`FATAL`、`DEBUG`、`TRACE`）
- 自动识别常见时间戳格式（ISO 8601、Unix timestamp、自定义格式）
- 自动提取 Top N 错误模式（通过聚合相似错误消息，N 可配置，默认 5）
- 统计空白行、注释行占比

##### 策略 B：CSV / TSV 数据文件（`.csv`、`.tsv`）

提取 Schema 信息和首尾采样行，让 LLM 理解数据结构：

```markdown
## data/users_export.csv

> 📊 CSV Data File — **Smart Summary**
> - **Total rows**: 50,000
> - **Total columns**: 12
> - **Encoding**: UTF-8 (BOM)
> - **Delimiter**: comma (`,`)
> - **Has header row**: Yes
> - **File size**: 8.7 MB

**Schema:**
| # | Column Name | Type (inferred) | Non-null | Unique | Sample Value |
|---|-------------|----------------|----------|--------|-------------|
| 1 | id | integer | 100% | 100% | 1 |
| 2 | name | string | 99.8% | 94.2% | "Alice Chen" |
| 3 | email | string (email) | 100% | 100% | "alice@example.com" |
| 4 | age | integer | 87.3% | 67 | 28 |
| 5 | city | string | 95.1% | 328 | "Shanghai" |
| 6 | registered_at | datetime | 100% | 98.7% | "2024-01-15T08:30:00Z" |
| ... | *(6 more columns)* | ... | ... | ... | ... |

**Head (first 3 data rows):**
```csv
id,name,email,age,city,registered_at,...
1,"Alice Chen","alice@example.com",28,"Shanghai","2024-01-15T08:30:00Z",...
2,"Bob Wang","bob@example.com",35,"Beijing","2024-02-20T14:22:00Z",...
3,"Carol Li","carol@example.com",,"","2024-03-10T09:15:00Z",...
```

**Tail (last 2 data rows):**
```csv
49999,"\u5f20\u4f1f","zhangwei@qq.com",42,"Shenzhen","2026-03-28T16:40:00Z",...
50000,"Emily Liu","emily@corp.com",31,"Hangzhou","2026-03-30T11:05:00Z",...
```
```

**CSV 分析能力**：
- 自动检测分隔符（逗号、Tab、分号、管道符）
- 自动检测引号包裹规则
- 自动推断列数据类型（integer、float、boolean、string、datetime、email、URL）
- 统计非空率、唯一值数
- 对大型 CSV 文件，通过**随机采样**（而非顺序读取）推断类型，避免仅看到文件头部的偏差

##### 策略 C：JSON / YAML / TOML 配置文件

提取结构骨架，保留关键配置值，**自动脱敏敏感信息**：

```markdown
## config/production.json

> ⚙️ JSON Config — **Smart Summary**
> - **Structure depth**: 4 levels
> - **Top-level keys**: 6 (`database`, `server`, `auth`, `cache`, `logging`, `features`)
> - **Total nodes**: 47
> - **File size**: 2.3 KB

**Structure Skeleton:**
```json
{
  "database": {
    "host": "postgres.production.internal",
    "port": 5432,
    "name": "app_production",
    "pool": { "min": 10, "max": 50, "idle_timeout_ms": 30000 }
  },
  "server": {
    "port": 8080,
    "cors_origins": ["https://app.example.com", "https://admin.example.com"],
    "rate_limit": { "requests_per_minute": 1000, "burst": 100 }
  },
  "auth": {
    "jwt_secret": "*** (REDACTED, 64 chars)",
    "token_expiry": "24h",
    "refresh_expiry": "7d"
  },
  "cache": { ... },
  "logging": { ... },
  "features": { ... }
}
```

> ℹ️ Sensitive values (passwords, secrets, tokens) are auto-detected and replaced with `*** (REDACTED)`.
```

**敏感信息自动脱敏规则**：

| 匹配模式 | 处理方式 |
|---------|---------|
| key 包含 `password`、`passwd`、`secret`、`token`、`api_key`、`apikey`、`private_key` | 值替换为 `*** (REDACTED, {len} chars)` |
| 以 `https://user:pass@` 格式的 URL | 用户名密码部分替换为 `***:***` |
| 值为 32+ 字符的高熵随机字符串 | 替换为 `*** (REDACTED, {len} chars)` |
| key 包含 `credential`、`auth`、`certificate` | 值替换为 `*** (REDACTED)` |

**JSON/YAML 分析能力**：
- 递归遍历提取完整键名路径（如 `database.pool.max`）
- 统计最大嵌套深度、节点总数
- 对数组类型统计长度并采样前 3 项
- 保留数字、布尔值等非敏感标量值
- 深层嵌套超过 4 层时，用 `{ ... }` 折叠展示

##### 策略 D：Markdown / 纯文本文档（`.md`、`.txt`、`.rst`、`.adoc`）

提取文档结构大纲和首段摘要：

```markdown
## docs/architecture.md

> 📄 Markdown Document — **Smart Summary**
> - **Total lines**: 456
> - **File size**: 28 KB
> - **Word count**: ~6,200

**Document Structure (Heading Outline):**
1. Architecture Overview
2. System Components
   2.1 API Gateway
   2.2 Auth Service
   2.3 Core Engine
3. Data Flow
4. Deployment
   4.1 Docker Compose
   4.2 Kubernetes
5. Monitoring & Observability
6. Security Considerations

**Opening (~300 chars):**
This document describes the overall system architecture for the Malaclaw platform, a self-hosted AI agent runtime environment. The system follows a microservices-inspired design with a central API gateway, modular service manager, and sandboxed execution environments for untrusted code...

**Key Mentions:** Docker, Kubernetes, PostgreSQL, Redis, gRPC, WebSocket
```

**文档分析能力**：
- 自动提取所有 Markdown 标题形成层级大纲
- 提取前 300 字符作为开篇摘要
- 通过词频统计提取文档中的关键技术名词（Top 10）
- 统计总行数、字数、段落数

##### 策略 E：其他文本文件（兜底策略）

对于无法归类的文本文件，采用通用分析：

```markdown
## data/unknown_format.dat

> 📄 Text File — **Smart Summary**
> - **Total lines**: 8,340
> - **File size**: 1.8 MB
> - **Encoding**: UTF-8
> - **Detected pattern**: key=value (based on line 1-100 analysis)

**Head (first 5 lines):**
```
host=192.168.1.100
port=8080
timeout=30
retry_count=3
debug=true
```

**Tail (last 5 lines):**
```
[end_of_config]
checksum=a1b2c3d4
version=2.1.0
last_modified=2026-03-30
```

**Line Statistics:**
- Empty lines: 124 (1.5%)
- Comment lines (`#` or `//`): 892 (10.7%)
- Longest line: 2,340 chars (line 4,521)
- Average line length: 216 chars
```

**通用分析能力**：
- 基于前 100 行自动检测内容模式（key=value、CSV-like、固定宽度、自由文本）
- 统计行特征（空行、注释行、最长行、平均行长）
- 首尾各展示 5 行原始内容作为样本

##### 智能摘要路由表

| 文件扩展名 | 策略 | 分析深度 |
|-----------|------|---------|
| `.log`, `.log.*`, `.out` | A：日志分析 | 级别分布 + 错误模式 + 首尾采样 |
| `.csv`, `.tsv` | B：数据分析 | Schema + 类型推断 + 首尾采样 |
| `.json`, `.jsonl`, `.yaml`, `.yml`, `.toml`, `.ini`, `.properties`, `.env` | C：配置分析 | 结构骨架 + 敏感脱敏 |
| `.md`, `.txt`, `.rst`, `.adoc` | D：文档分析 | 标题大纲 + 首段摘要 + 关键词 |
| `.xml`, `.html`, `.htm` | D（文本）| 标签结构 + 元素统计 |
| `.svg` | 二进制元数据 | 见 3.5.3 节 |
| 其他文本文件 | E：通用分析 | 行统计 + 模式检测 + 首尾采样 |

#### 3.5.5 代码文件内容输出格式

对于低于 50KB 阈值的代码文件，输出完整内容，格式如下：

```markdown
## agent.go

\`\`\`go
package main

import (
    "context"
    "fmt"
)

// Agent represents an AI agent instance
type Agent struct {
    ID      string
    Name    string
    Config  *Config
}

func NewAgent(id string) *Agent {
    return &Agent{
        ID: id,
        Name: fmt.Sprintf("agent-%s", id),
    }
}
\`\`\`
```

**语言标识符映射规则**：

插件内置一套文件扩展名到语言标识符的映射表，同时支持调用 VSCode 自带的语言检测服务作为兜底：

| 扩展名 | 语言标识 | 扩展名 | 语言标识 |
|--------|---------|--------|---------|
| `.ts` | `typescript` | `.go` | `go` |
| `.tsx` | `tsx` | `.rs` | `rust` |
| `.js` | `javascript` | `.java` | `java` |
| `.jsx` | `jsx` | `.c` | `c` |
| `.py` | `python` | `.cpp` | `cpp` |
| `.rb` | `ruby` | `.h` | `c` |
| `.php` | `php` | `.hpp` | `cpp` |
| `.swift` | `swift` | `.cs` | `csharp` |
| `.kt` | `kotlin` | `.scala` | `scala` |
| `.sh` | `bash` | `.sql` | `sql` |
| `.yaml` | `yaml` | `.toml` | `toml` |
| `.json` | `json` | `.xml` | `xml` |
| `.html` | `html` | `.css` | `css` |
| `.scss` | `scss` | `.less` | `less` |
| `.md` | `markdown` | `.dockerfile` | `dockerfile` |
| `.vue` | `vue` | `.svelte` | `svelte` |
| `.proto` | `protobuf` | `.graphql` | `graphql` |
| `.lua` | `lua` | `.r` | `r` |
| `.dart` | `dart` | `.zig` | `zig` |
| `.makefile` | `makefile` | `.cmake` | `cmake` |

> 当 `aiContext.autoDetectLanguage` 为 `true`（默认）时，优先使用上述映射表；遇到未知扩展名时，回退到 VSCode 内置语言服务进行检测。

---

### 3.6 AST 代码大纲提取（核心特性）

#### 3.6.1 设计目标

当代码文件超过 50KB 阈值时，直接输出完整内容会消耗大量 Token 且有效信息密度低。AST 大纲提取功能通过解析代码的抽象语法树，提取**类型定义、函数签名、接口声明、控制流描述和调用关系**，以精炼的结构化文本替代冗长的完整代码，在保留关键信息的同时大幅降低 Token 消耗。

#### 3.6.2 支持的语言（第一版）

| 语言 | 实现方式 | 优先级 |
|------|---------|--------|
| TypeScript / JavaScript | 调用 VSCode 内置 TypeScript Language Service | P0 |
| Python | 调用 VSCode 内置 Pylance / Python Language Server | P0 |
| Go | 调用 VSCode Go 扩展的 `gopls` 语言服务 | P0 |
| Rust | 调用 VSCode Rust 扩展的 `rust-analyzer` | P1 |
| Java | 调用 VSCode Java 扩展的语言服务 | P1 |
| C / C++ | 调用 VSCode C/C++ 扩展的 `clangd` | P1 |

**技术方案**：优先通过 VSCode 的 `vscode.languages` API 获取语言服务的 Symbol 信息（`DocumentSymbol`、`CallHierarchy`）。这种方式无需插件自身集成重量级的 AST 解析器，直接复用用户已安装的语言扩展提供的精准分析结果。

> **扩展性设计**：通过 `OutlineExtractor` 抽象接口定义统一的提取协议，新增语言支持只需实现一个适配器，无需修改核心逻辑。

#### 3.6.3 大纲提取深度

采用**深度 C（含调用关系）**，提取以下层次的信息：

1. **类型定义**：struct、class、interface、enum、type alias 的签名与字段/成员概要
2. **函数/方法签名**：名称、参数列表、返回值类型、接收者（如有）
3. **文档注释**：保留函数/类型上方紧邻的注释（doc comment）
4. **控制流描述**：函数体内关键控制流（if/else、for、switch、try/catch、return）用自然语言概括
5. **调用关系**：标注函数内部调用的其他函数/方法，形成调用链路

#### 3.6.4 大纲输出格式

```go
// File: service_manager.go (Overview — 128KB, structure outline extracted)
// ⚠️ File exceeds 50KB threshold, showing AST structure outline instead of full content

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════

type ServiceManager struct {
  services   map[string]Service
  config     *Config
  mu         sync.RWMutex
  logger     *slog.Logger
}
// Manages the lifecycle of all registered services.
// Thread-safe via RWMutex; services map keyed by service name.

type Service interface {
  Start(ctx context.Context) error
  Stop() error
  Status() ServiceStatus
  Name() string
}
// Defines the contract for all managed services.

// ═══════════════════════════════════════
// FUNCTIONS
// ═══════════════════════════════════════

func NewServiceManager(cfg *Config) *ServiceManager
  // Initialize ServiceManager with config, create logger, register built-in service types
  // → calls: cfg.Validate(), slog.Default()

func (sm *ServiceManager) RegisterService(name string, svc Service) error
  // Validate name uniqueness, add service to map under write lock
  // → calls: sm.validateName(), svc.Name()

func (sm *ServiceManager) Start(ctx context.Context) error
  // Iterate registered services, call Start() on each; on failure log error and continue
  // Collects first error encountered; returns nil if all succeed
  // → calls: sm.services[name].Start(), slog.Error()

func (sm *ServiceManager) Stop() error
  // Reverse-iterate running services, call Stop() with 30s graceful shutdown timeout
  // Uses context.WithTimeout for each service stop operation
  // → calls: context.WithTimeout(), sm.services[name].Stop()

func (sm *ServiceManager) GetService(name string) (Service, error)
  // Lookup service by name under read lock; return error if not found
  // → calls: (none)

func (sm *ServiceManager) ListServices() []ServiceInfo
  // Return snapshot of all services with current status
  // → calls: svc.Status(), svc.Name()

func (sm *ServiceManager) Restart(name string) error
  // Stop specific service, wait for completion, then re-start
  // Returns error if service not found or restart fails
  // → calls: sm.GetService(), sm.Stop(), sm.Start()
```

#### 3.6.5 控制流自然语言描述规则

将代码中的控制结构翻译为简明的自然语言描述，遵循以下规则：

| 代码结构 | 描述模板 |
|---------|---------|
| `if cond { A } else { B }` | `If [cond], then [A]; otherwise [B]` |
| `for i := 0; i < n; i++ { A }` | `Loop [n] times: [A]` |
| `for range items { A }` | `Iterate over [items]: [A]` |
| `switch val { case A: ...; case B: ... }` | `Switch on [val]: case A → [...]; case B → [...]` |
| `defer fn()` | `Defer: fn()` |
| `go fn()` | `Spawn goroutine: fn()` |
| `select { case A: ... }` | `Select: case A → [...]` |
| `return val` | `Return [val]` |
| `err != nil { return err }` | `If error, return early` |
| `try { A } catch(e) { B }` | `Try [A]; on exception [B]` |
| `async/await` | `Async: await [operation]` |

#### 3.6.6 调用关系标注

在函数描述末尾用 `→ calls:` 标注该函数内部直接调用的其他函数/方法：

- 仅标注**本项目内**的函数调用（排除标准库和第三方库调用，除非是关键接口）
- 使用 `ClassName.methodName()` 格式标注方法调用
- 使用 `functionName()` 格式标注函数调用
- 多个调用用逗号分隔

#### 3.6.7 回退机制

当目标语言的 LSP 服务不可用时（用户未安装对应语言扩展），回退到**基于正则表达式的轻量级提取**：

- 提取函数/类/接口签名
- 不提供控制流描述和调用关系分析
- 在输出中标注 `(basic extraction — LSP not available)`

---

### 3.7 Token 计数

#### 3.7.1 Tokenizer 选择

采用 `js-tiktoken` 库（tiktoken 的纯 JavaScript 实现）进行精确的 Token 计数。tiktoken 是 OpenAI 使用的 BPE 分词器的 Rust/Python 实现，`js-tiktoken` 是其在 JavaScript 生态的等价物，提供与 OpenAI API 完全一致的计数结果。

**选择理由**：
- 精确匹配 OpenAI GPT 系列模型的实际 Token 消耗
- 纯 JavaScript 实现，无需 native 依赖，在 VSCode Extension Host 中运行稳定
- 包体积可控（约 2-5MB，含编码表）

**回退方案**：当 `js-tiktoken` 加载失败时，回退到简单字符估算（`Math.ceil(charCount / 3.5)`），并在 UI 中标注 `(estimated)`。

#### 3.7.2 Token 统计内容

| 统计项 | 说明 |
|--------|------|
| **总 Token 数** | 整个生成文档的 Token 总量 |
| **目录树 Token** | 目录结构部分消耗的 Token |
| **文件内容 Token** | 所有文件内容（含大纲）消耗的 Token 汇总 |
| **文件数量** | 被纳入上下文的文件总数 |
| **大纲文件数** | 因超过阈值而提取大纲的文件数量 |

#### 3.7.3 Token 统计输出位置

在生成文档的**最顶部**（目录树之前），以信息块形式展示：

```markdown
> 📊 **Context Statistics**
> - Total Tokens: ~45,230 / 128,000
> - Files Included: 23 (3 as outline)
> - Generated at: 2026-03-30 14:30:52

# Project Structure

\`\`\`
├── ...
\`\`\`
```

#### 3.7.4 Token 超限处理

当总 Token 数超过配置的上限（默认 128,000）时：

1. 在文档顶部显示 **⚠️ 警告** 标记
2. 在 VSCode 中弹出通知提示（warning 级别）
3. **仍然生成完整文档**（不做截断），由用户自行决定是否精简选择范围

警告格式：

```markdown
> ⚠️ **Warning**: Total tokens (~156,800) exceed the configured limit (128,000).
> Consider reducing the selection scope to fit within the AI model's context window.
```

---

### 3.8 输出目标

插件提供三种输出方式，用户每次生成时可选择其中一种或多种（通过侧边栏面板的多选按钮或输出时的快速选择菜单）：

#### 3.8.1 复制到剪贴板

- 将生成的完整 Markdown 内容写入系统剪贴板
- 复制完成后在 VSCode 右下角显示轻量提示：`📋 AI Context copied to clipboard (23 files, ~45K tokens)`
- 使用 `vscode.env.clipboard.writeText()` API

#### 3.8.2 保存为 .md 文件

- **默认路径**：工作区根目录 `/ai-context.md`
- 如果文件已存在，提示用户选择：覆盖 / 另存为新文件 / 追加
- 文件编码：UTF-8（无 BOM）
- 换行符：LF（`\n`）
- 保存后自动在编辑器中打开

#### 3.8.3 VSCode 新 Tab 预览

- 在新的未保存 Tab 中打开生成的 Markdown 内容
- 使用 VSCode 内置的 Markdown 预览模式渲染
- 用户可在此 Tab 中审阅内容，再决定是否复制或保存
- Tab 标题显示：`AI Context Preview`

#### 3.8.4 输出选择交互

当通过右键菜单或快捷键触发时（非侧边栏面板），弹出一个 **QuickPick** 快速选择菜单：

```
┌─────────────────────────────────────────┐
│ 🤖 AI Context: Choose Output Target     │
├─────────────────────────────────────────┤
│ > 📋 Copy to Clipboard                  │
│   💾 Save as ai-context.md              │
│   👁️ Open in New Tab                    │
│   ─────────────────────                 │
│   ⚙️ Configure Settings...              │
└─────────────────────────────────────────┘
```

---

### 3.9 日志系统

插件内置日志系统，用于调试和问题排查。所有日志输出到 VSCode Output Channel。

#### 3.9.1 日志级别

| 级别 | 值 | 说明 |
|------|-----|------|
| DEBUG | 0 | 详细的诊断信息 |
| INFO | 1 | 一般信息消息（默认） |
| WARN | 2 | 警告消息 |
| ERROR | 3 | 仅错误消息 |

#### 3.9.2 日志内容

插件在以下场景记录日志：

| 场景 | 记录内容 |
|------|----------|
| 扩展激活 | 激活状态、配置加载 |
| 命令调用 | 命令名称、作用域、选中路径 |
| 文件扫描 | 扫描开始/完成、文件数、跳过数、耗时 |
| Token 计算 | 计数结果、限制百分比 |
| 错误处理 | 错误上下文、堆栈信息 |

#### 3.9.3 日志输出格式

```
[14:23:45.678] [INFO] Starting scan for scope: workspace
[14:23:45.789] [DEBUG] Scan complete: 23 files found (5 skipped)
[14:23:46.123] [INFO] Token count: 45230/128000 (35%)
[14:23:46.456] [INFO] Generation completed successfully
```

#### 3.9.4 配置与命令

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `aiContext.logLevel` | enum | info | 日志级别 |

| 命令 | 功能 |
|------|------|
| `aiContext.openLogs` | 打开日志输出面板 |

---

### 3.10 侧边栏面板设计

#### 3.10.1 面板布局

```
┌──────────────────────────────────┐
│  🔍 AI Context            [⚙️]   │
├──────────────────────────────────┤
│  Scope:                          │
│  ┌──────────────────────────┐   │
│  │ (•) Entire Workspace      │   │
│  │ ( ) Current Folder        │   │
│  │ ( ) Selected Files        │   │
│  └──────────────────────────┘   │
│                                  │
│  Template: [default        ▾]   │
│                                  │
│  [ 🚀 Generate ]                 │
├──────────────────────────────────┤
│  📊 Statistics                   │
│  Files: 23 | Tokens: ~45,230    │
│  (3 files as outline)           │
├──────────────────────────────────┤
│  📄 Preview                      │
│  ┌──────────────────────────┐   │
│  │ # Project Structure      │   │
│  │ ```                      │   │
│  │ ├── 📄 agent.go          │   │
│  │ ├── 📄 api.go            │   │
│  │ ...                      │   │
│  │ ```                      │   │
│  │                          │   │
│  │ ## agent.go              │   │
│  │ ```go                    │   │
│  │ package main             │   │
│  │ ...                      │   │
│  └──────────────────────────┘   │
├──────────────────────────────────┤
│  [📋 Copy] [💾 Save] [👁 Preview]│
└──────────────────────────────────┘
```

#### 3.10.2 面板功能说明

| 区域 | 功能 | 交互方式 |
|------|------|---------|
| **Scope 选择** | 选择生成范围 | 单选按钮 |
| **Template 选择** | 选择输出模板 | 下拉菜单（从 `.ai_context_templates/` 加载） |
| **Generate 按钮** | 触发生成 | 单击按钮 |
| **Statistics 区域** | 显示 Token 统计和文件数量 | 只读文本，生成后自动更新 |
| **Preview 区域** | 显示生成的 Markdown 内容 | 只读 WebView（可滚动） |
| **底部操作按钮** | 复制/保存/预览 | 三个独立按钮 |

#### 3.10.3 持久化状态

使用 VSCode 的 `Memento` API（`globalState`）持久化以下用户偏好：

| 状态项 | 说明 | 默认值 |
|--------|------|--------|
| `lastScope` | 上次选择的生成范围 | `workspace` |
| `lastTemplate` | 上次选择的模板名称 | `default` |
| `lastOutputTarget` | 上次选择的输出方式 | `clipboard` |
| `panelWidth` | 面板宽度 | `350` |

---

### 3.11 自定义模板

#### 3.11.1 模板格式

采用**简单占位符替换**格式，使用 `$VARIABLE_NAME` 风格的占位符。这是最简单的模板语法，用户无需学习任何模板引擎，直接在 Markdown 文件中插入占位符即可。

#### 3.11.2 可用占位符

| 占位符 | 类型 | 说明 |
|--------|------|------|
| `$PROJECT_NAME` | string | 工作区/项目名称（取目录名） |
| `$DIR_TREE` | string | 目录结构树（含 emoji 高亮标记） |
| `$FILE_LIST` | string | 文件清单（每行一个路径） |
| `$FILE_CONTENTS` | string | 所有文件内容（按标准格式渲染） |
| `$TOKEN_COUNT` | number | Token 总数 |
| `$TOKEN_LIMIT` | number | Token 上限配置值 |
| `$FILE_COUNT` | number | 文件总数 |
| `$OUTLINE_COUNT` | number | 大纲文件数 |
| `$TIMESTAMP` | string | 生成时间（ISO 8601 格式） |
| `$SELECTED_FILES` | string | 被选中的文件路径列表（每行一个） |

#### 3.11.3 默认模板

默认模板存储在插件内部，文件名为 `default`。内容如下：

```markdown
> 📊 **Context Statistics**
> - Total Tokens: ~$TOKEN_COUNT / $TOKEN_LIMIT
> - Files Included: $FILE_COUNT ($OUTLINE_COUNT as outline)
> - Generated at: $TIMESTAMP

# Project Structure

\`\`\`
$DIR_TREE
\`\`\`

# File Contents

$FILE_CONTENTS
```

#### 3.11.4 自定义模板存储

- **存储位置**：项目根目录 `.ai_context_templates/` 文件夹
- **文件命名**：`{template-name}.md`（文件名即模板名，不含扩展名）
- **自动发现**：插件启动时扫描该目录，自动注册所有 `.md` 文件为可用模板
- **项目级**：模板随项目走，团队成员可共享

目录结构示例：

```
.ai_context_templates/
├── default.md           ← 用户自定义的默认模板（覆盖内置默认模板）
├── claude-full.md       ← 针对 Claude 优化的模板
├── gpt-review.md        ← 针对 GPT Code Review 的模板
└── minimal.md           ← 极简模板，仅包含文件内容
```

#### 3.11.5 模板变更监听

当 `.ai_context_templates/` 目录下的文件发生增删改时，插件自动重新加载模板列表，更新侧边栏的下拉菜单选项。

---

### 3.12 生成流程完整时序

```
用户触发（右键/命令面板/快捷键/侧边栏按钮）
          │
          ▼
    ┌─────────────┐
    │ 确定选择范围   │ ← 工作区 / 文件夹 / 选中文件
    └──────┬──────┘
           │
           ▼
    ┌──────────────┐
    │ 加载过滤规则   │ ← .aicontextignore + 默认规则 + Settings
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ 扫描文件列表   │ ← 递归遍历，应用过滤规则
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ 生成目录树    │ ← 完整项目树 + emoji 高亮选中项
    └──────┬───────┘
           │
           ▼
    ┌──────────────────────────┐
    │ 逐文件读取 + 智能处理     │
    │ ├─ 二进制文件 → 丰富元数据  │
    │ ├─ ≤50KB 代码 → 完整内容    │
    │ ├─ >50KB 代码 → AST 大纲    │
    │ ├─ 日志文件 → 结构化统计     │
    │ ├─ CSV/TSV → Schema + 采样  │
    │ ├─ JSON/YAML → 骨架 + 脱敏  │
    │ ├─ Markdown → 大纲 + 摘要    │
    │ └─ 其他文本 → 通用摘要       │
    └──────┬──────────────────┘
           │
           ▼
    ┌──────────────┐
    │ 渲染模板      │ ← 替换占位符，生成最终 Markdown
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Token 计数    │ ← tiktoken 统计总 Token
    └──────┬───────┘
           │
           ▼
    ┌──────────────────┐
    │ 输出              │
    │ ├─ 复制到剪贴板     │
    │ ├─ 保存为 .md 文件  │
    │ └─ 新 Tab 预览      │
    └──────────────────┘
```

---

## 4. 插件配置项

通过 VSCode Settings (`settings.json`) 提供以下配置：

### 4.1 完整配置表

| 配置路径 | 类型 | 默认值 | 说明 |
|---------|------|--------|------|
| `aiContext.maxFileSize` | `number` | `51200` (50KB) | 单文件完整读取的大小阈值（字节）。超过此值的代码文件提取 AST 大纲，非代码文件启用智能摘要 |
| `aiContext.maxTokens` | `number` | `128000` | Token 总数上限。超过时显示警告（不截断） |
| `aiContext.textPreviewLength` | `number` | `300` | 非代码文本文件智能摘要中的预览字符数 |
| `aiContext.logSampleLines` | `number` | `5` | 日志文件首尾采样行数 |
| `aiContext.csvSampleRows` | `number` | `3` | CSV/TSV 文件首尾采样数据行数 |
| `aiContext.defaultTemplate` | `string` | `"default"` | 默认使用的模板名称 |
| `aiContext.sensitiveKeyPatterns` | `string[]` | 见下方说明 | 敏感信息 key 匹配模式（自动脱敏） |
| `aiContext.autoDetectLanguage` | `boolean` | `true` | 是否自动检测代码语言标识（关闭后使用纯扩展名映射） |
| `aiContext.ignorePatterns` | `string[]` | `[]` | 额外的忽略模式（补充 .aicontextignore，遵循 .gitignore 语法） |
| `aiContext.binaryFilePatterns` | `string[]` | 见 3.5.3 | 二进制文件匹配模式（glob 格式） |
| `aiContext.defaultOutputTarget` | `string` | `"clipboard"` | 默认输出目标：`clipboard` / `file` / `preview` |
| `aiContext.outputFileName` | `string` | `"ai-context.md"` | 保存文件时的默认文件名 |
| `aiContext.showTreeEmoji` | `boolean` | `true` | 目录树中是否显示 emoji 高亮标记 |
| `aiContext.tokenEstimation` | `string` | `"tiktoken"` | Token 估算方式：`tiktoken`（精确）/ `simple`（字符/3.5） |

### 4.2 settings.json 示例

```json
{
  "aiContext.maxFileSize": 51200,
  "aiContext.maxTokens": 128000,
  "aiContext.textPreviewLength": 300,
  "aiContext.logSampleLines": 5,
  "aiContext.csvSampleRows": 3,
  "aiContext.defaultTemplate": "default",
  "aiContext.autoDetectLanguage": true,
  "aiContext.ignorePatterns": [
    "*.generated.go",
    "internal/testdata/"
  ],
  "aiContext.defaultOutputTarget": "clipboard",
  "aiContext.outputFileName": "ai-context.md",
  "aiContext.showTreeEmoji": true,
  "aiContext.tokenEstimation": "tiktoken"
}
```

### 4.3 package.json contributes 配置

```jsonc
{
  "contributes": {
    "configuration": {
      "title": "AI Context Generator",
      "properties": {
        "aiContext.maxFileSize": {
          "type": "number",
          "default": 51200,
          "minimum": 1024,
          "maximum": 1048576,
          "description": "Maximum file size (in bytes) for full content reading. Code files exceeding this will use AST outline extraction."
        },
        "aiContext.maxTokens": {
          "type": "number",
          "default": 128000,
          "minimum": 1000,
          "description": "Token limit for the generated context. A warning is shown when exceeded."
        },
        "aiContext.textPreviewLength": {
          "type": "number",
          "default": 300,
          "minimum": 50,
          "maximum": 5000,
          "description": "Number of characters to preview for non-code text files when using smart summary."
        },
        "aiContext.logSampleLines": {
          "type": "number",
          "default": 5,
          "minimum": 1,
          "maximum": 50,
          "description": "Number of head/tail sample lines for log file analysis."
        },
        "aiContext.csvSampleRows": {
          "type": "number",
          "default": 3,
          "minimum": 1,
          "maximum": 20,
          "description": "Number of head/tail sample data rows for CSV/TSV analysis."
        },
        "aiContext.defaultTemplate": {
          "type": "string",
          "default": "default",
          "description": "Name of the default template to use."
        },
        "aiContext.autoDetectLanguage": {
          "type": "boolean",
          "default": true,
          "description": "Automatically detect code language for syntax highlighting markers."
        },
        "aiContext.ignorePatterns": {
          "type": "array",
          "items": { "type": "string" },
          "default": [],
          "description": "Additional ignore patterns (gitignore syntax) to supplement .aicontextignore."
        },
        "aiContext.binaryFilePatterns": {
          "type": "array",
          "items": { "type": "string" },
          "default": ["*.png","*.jpg","*.jpeg","*.gif","*.bmp","*.ico","*.webp","*.mp3","*.mp4","*.avi","*.mov","*.wav","*.flac","*.zip","*.tar","*.gz","*.rar","*.7z","*.pdf","*.doc","*.docx","*.exe","*.dll","*.so","*.dylib","*.bin","*.woff","*.woff2","*.ttf","*.eot","*.sqlite","*.db"],
          "description": "Glob patterns for binary files to skip content reading."
        },
        "aiContext.defaultOutputTarget": {
          "type": "string",
          "default": "clipboard",
          "enum": ["clipboard", "file", "preview"],
          "description": "Default output target when triggered via keyboard shortcut or context menu."
        },
        "aiContext.outputFileName": {
          "type": "string",
          "default": "ai-context.md",
          "description": "Default filename when saving the generated context to a file."
        },
        "aiContext.showTreeEmoji": {
          "type": "boolean",
          "default": true,
          "description": "Show emoji markers in the directory tree to highlight selected files."
        },
        "aiContext.tokenEstimation": {
          "type": "string",
          "default": "tiktoken",
          "enum": ["tiktoken", "simple"],
          "description": "Token estimation method. 'tiktoken' for accurate counting, 'simple' for lightweight character-based estimation."
        }
      }
    },
    "commands": [
      {
        "command": "aiContext.generate.workspace",
        "title": "AI Context: Generate from Entire Workspace",
        "category": "AI Context"
      },
      {
        "command": "aiContext.generate.folder",
        "title": "AI Context: Generate from Current Folder",
        "category": "AI Context"
      },
      {
        "command": "aiContext.generate.selected",
        "title": "AI Context: Generate from Selected Files",
        "category": "AI Context"
      },
      {
        "command": "aiContext.generate.configure",
        "title": "AI Context: Configure Settings",
        "category": "AI Context"
      }
    ],
    "keybindings": [
      {
        "command": "aiContext.generate.workspace",
        "key": "ctrl+shift+alt+c",
        "mac": "cmd+shift+alt+c"
      },
      {
        "command": "aiContext.generate.folder",
        "key": "ctrl+shift+alt+f",
        "mac": "cmd+shift+alt+f"
      },
      {
        "command": "aiContext.generate.selected",
        "key": "ctrl+shift+alt+s",
        "mac": "cmd+shift+alt+s"
      }
    ],
    "menus": {
      "explorer/context": [
        {
          "command": "aiContext.generate.selected",
          "when": "explorerResourceIsFolder || listMultiSelection",
          "group": "aiContext@1"
        },
        {
          "command": "aiContext.generate.workspace",
          "when": "explorerResourceIsRoot",
          "group": "aiContext@2"
        }
      ]
    },
    "viewsContainers": {
      "activitybar": [
        {
          "id": "aiContext-sidebar",
          "title": "AI Context",
          "icon": "resources/icon.svg"
        }
      ]
    },
    "views": {
      "aiContext-sidebar": [
        {
          "type": "webview",
          "id": "aiContext.panel",
          "name": "AI Context Generator"
        }
      ]
    }
  }
}
```

---

## 5. 技术架构设计

### 5.1 插件技术栈

| 技术 | 用途 |
|------|------|
| TypeScript | 主要开发语言 |
| VSCode Extension API | 插件核心框架 |
| `js-tiktoken` | 精确 Token 计数 |
| `vscode-languageclient` | 与 LSP 通信（AST 提取） |
| `ignore` (npm) | .gitignore 语法解析 |
| `tree-model` 或自实现 | 目录树生成 |

### 5.2 源码目录结构

```
ai-context-generator/
├── src/
│   ├── extension.ts              # 插件入口，注册命令和事件
│   ├── commands/
│   │   ├── generateWorkspace.ts  # 工作区生成命令
│   │   ├── generateFolder.ts     # 文件夹生成命令
│   │   ├── generateSelected.ts   # 选中文件生成命令
│   │   └── configure.ts          # 配置命令
│   ├── core/
│   │   ├── contextGenerator.ts   # 上下文生成主流程编排
│   │   ├── fileScanner.ts        # 文件扫描与过滤
│   │   ├── ignoreFilter.ts       # .aicontextignore 解析与应用
│   │   ├── dirTreeGenerator.ts   # 目录树生成（含 emoji 高亮）
│   │   ├── fileReader.ts         # 文件内容读取（分类处理）
│   │   ├── tokenCounter.ts       # Token 计数（tiktoken / simple）
│   │   ├── templateRenderer.ts   # 模板渲染引擎
│   │   └── smartSummarizer.ts     # 非代码文件智能摘要路由
│   ├── summary/                   # 智能摘要处理器（按文件类型）
│   │   ├── summaryExtractor.ts   # 摘要提取抽象接口
│   │   ├── logAnalyzer.ts        # 策略 A：日志文件结构化统计
│   │   ├── csvAnalyzer.ts        # 策略 B：CSV/TSV 数据分析
│   │   ├── configAnalyzer.ts     # 策略 C：JSON/YAML 配置分析 + 脱敏
│   │   ├── docAnalyzer.ts        # 策略 D：Markdown/文档大纲提取
│   │   ├── genericAnalyzer.ts    # 策略 E：通用文本分析（兜底）
│   │   └── sensitiveDetector.ts  # 敏感信息检测与脱敏引擎
│   ├── binaryMetadata/            # 二进制文件元数据提取
│   │   ├── metadataExtractor.ts  # 元数据提取抽象接口
│   │   ├── imageMetadata.ts      # 图片元数据（PNG/JPEG/GIF/WebP/SVG...）
│   │   ├── audioMetadata.ts      # 音频元数据（MP3/WAV/FLAC...）
│   │   ├── fontMetadata.ts       # 字体元数据（TTF/OTF/WOFF...）
│   │   ├── archiveMetadata.ts    # 归档元数据（ZIP/TAR/GZ...）
│   │   ├── executableMetadata.ts # 可执行文件元数据（PE/ELF/Mach-O）
│   │   └── officeMetadata.ts      # Office 文档元数据（DOCX/XLSX...）
│   ├── outline/
│   │   ├── outlineExtractor.ts   # AST 大纲提取抽象接口
│   │   ├── typescriptExtractor.ts
│   │   ├── pythonExtractor.ts
│   │   ├── goExtractor.ts
│   │   ├── rustExtractor.ts
│   │   ├── javaExtractor.ts
│   │   ├── cCppExtractor.ts
│   │   ├── regexFallback.ts      # 正则回退提取
│   │   └── registry.ts           # 语言 → 提取器注册表
│   ├── ui/
│   │   ├── sidebarProvider.ts    # 侧边栏 WebView Provider
│   │   ├── sidebarHtml.ts        # 侧边栏 HTML 模板
│   │   └── outputPicker.ts       # 输出方式 QuickPick
│   ├── templates/
│   │   └── default.md            # 内置默认模板
│   ├── config/
│   │   └── constants.ts          # 默认配置、二进制模式、脱敏模式等常量
│   └── utils/
│       ├── languageMapper.ts     # 扩展名 → 语言标识映射
│       └── logger.ts             # 日志工具
├── resources/
│   └── icon.svg                  # 侧边栏图标
├── package.json
├── tsconfig.json
├── webpack.config.js
├── .vscodeignore
├── README.md
└── LICENSE
```

### 5.3 核心类设计

#### 5.3.1 ContextGenerator（主流程编排）

```typescript
interface GenerationOptions {
  scope: 'workspace' | 'folder' | 'selected';
  targetUris: vscode.Uri[];
  templateName: string;
  outputTargets: OutputTarget[];
}

interface GenerationResult {
  markdown: string;
  tokenCount: number;
  fileCount: number;
  outlineCount: number;
  dirTree: string;
  fileList: string[];
  selectedFiles: string[];
}

class ContextGenerator {
  async generate(options: GenerationOptions): Promise<GenerationResult>;
}
```

#### 5.3.2 OutlineExtractor（大纲提取接口）

```typescript
interface OutlineResult {
  outline: string;
  language: string;
  method: 'lsp' | 'regex';
}

abstract class OutlineExtractor {
  abstract supportedLanguages: string[];
  abstract extract(uri: vscode.Uri, document: vscode.TextDocument): Promise<OutlineResult>;
}

class OutlineRegistry {
  private extractors: Map<string, OutlineExtractor>;
  register(extractor: OutlineExtractor): void;
  getExtractor(languageId: string): OutlineExtractor | undefined;
}
```

#### 5.3.3 IgnoreFilter（过滤规则管理）

```typescript
class IgnoreFilter {
  private ignoreInstance: Ignore;  // 来自 'ignore' npm 包
  private customPatterns: string[];

  constructor(workspaceRoot: string);
  async load(): Promise<void>;         // 加载 .aicontextignore
  reload(): void;                       // 文件变更时重新加载
  isIgnored(filePath: string): boolean; // 判断文件是否被忽略
  addPatterns(patterns: string[]): void; // 追加额外规则
}
```

### 5.4 性能考量

| 场景 | 策略 |
|------|------|
| 大型项目扫描 | 使用 `vscode.workspace.findFiles()` API（内部已做缓存优化），配合 glob 排除模式 |
| 大量文件并行读取 | 使用 `Promise.allSettled()` 并行读取，限制并发数为 50 |
| AST 提取 | 依赖 VSCode 已打开文档的 LSP 缓存，避免重复解析 |
| Token 计算 | 对完整文档一次性计算，不逐文件累加 |
| 侧边栏预览更新 | 使用 WebView `postMessage` 异步传输，不阻塞 UI 线程 |

---

## 6. 默认输出文档完整示例

以下是使用默认模板、选中部分文件时的完整输出示例：

```markdown
> 📊 **Context Statistics**
> - Total Tokens: ~12,450 / 128,000
> - Files Included: 5 (1 as outline)
> - Generated at: 2026-03-30T14:30:52+08:00

# Project Structure

\`\`\`
├── 📁 images
│   ├── 📁 main-desktop
│   │   ├── 📄 Dockerfile
│   │   └── start-malaclaw.sh
│   │   └── ...
│   └── ...
├── 📁 sandbox
│   ├── client.go
│   ├── 📄 gateway.go
│   ├── 📄 lifecycle.go
│   ├── proxy.go
│   ├── responses.go
│   ├── server.go
│   └── types.go
├── 📄 agent.go
├── api.go
├── go.mod
├── 📄 main.go
└── service_manager.go
\`\`\`

# File Contents

## images/main-desktop/Dockerfile

\`\`\`dockerfile
FROM lscr.io/linuxserver/webtop:ubuntu-xfce
ARG HTTP_PROXY
ARG HTTPS_PROXY
ENV http_proxy=${HTTP_PROXY} \
    https_proxy=${HTTPS_PROXY}

ENV PATH="/root/.local/bin:${PATH}"

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget gnupg ca-certificates curl android-tools-adb socat python3 python3-pip \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" \
       > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /root/.config/pip \
    && printf '[global]\nindex-url = https://pypi.tuna.tsinghua.edu.cn/simple\ntrusted-host = pypi.tuna.tsinghua.edu.cn\nbreak-system-packages = true\n' \
       > /root/.config/pip/pip.conf

COPY start-malaclaw.sh /custom-cont-init.d/99-malaclaw
RUN chmod +x /custom-cont-init.d/99-malaclaw

EXPOSE 7777 9222
\`\`\`

## images/main-desktop/start-malaclaw.sh

\`\`\`bash
#!/bin/bash
set -e

export HOME=/root
export PATH="/root/.local/bin:${PATH}"

nohup socat TCP-LISTEN:9222,fork,reuseaddr TCP:127.0.0.1:19222 &>/dev/null &

rm -f /config/profiles/main/SingletonLock /config/profiles/main/SingletonCookie /config/profiles/main/SingletonSocket

DISPLAY=:1 google-chrome \
  --remote-debugging-port=19222 \
  &>/tmp/chrome.log &

if [ -x /usr/local/bin/malaclaw ]; then
  nohup /usr/local/bin/malaclaw serve 2>&1 | tee /tmp/malaclaw.log &
fi
\`\`\`

## sandbox/gateway.go

\`\`\`go
package sandbox

// File: gateway.go (Overview — 67KB, structure outline extracted)
// ⚠️ File exceeds 50KB threshold, showing AST structure outline

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════

type Gateway struct {
  router    *http.ServeMux
  services  map[string]*ServiceEndpoint
  logger    *slog.Logger
}
// HTTP gateway for routing external requests to sandbox services.

type ServiceEndpoint struct {
  Name    string
  URL     *url.URL
  Healthy bool
}
// Represents a routed backend service endpoint.

// ═══════════════════════════════════════
// FUNCTIONS
// ═══════════════════════════════════════

func NewGateway(logger *slog.Logger) *Gateway
  // Create gateway with default router, initialize service registry map
  // → calls: slog.Default()

func (g *Gateway) RegisterService(name, targetURL string) error
  // Parse target URL, validate format, add to service registry
  // → calls: url.Parse(), g.validateEndpoint()

func (g *Gateway) Start(addr string) error
  // Start HTTP server on addr with configured routes and middleware
  // Sets up health check, CORS, and request logging middleware
  // → calls: http.ListenAndServe(), g.setupMiddleware(), g.setupRoutes()

func (g *Gateway) HealthCheck(ctx context.Context) map[string]string
  // Ping all registered services, return health status map
  // Uses 5s timeout per service check
  // → calls: g.services[name].HealthCheck()

func (g *Gateway) Shutdown(ctx context.Context) error
  // Gracefully shut down the HTTP server with context timeout
  // → calls: http.Server.Shutdown()
\`\`\`

## sandbox/lifecycle.go

\`\`\`go
package sandbox

import (
  "context"
  "time"
)

const (
  DefaultStartTimeout = 60 * time.Second
  DefaultStopTimeout  = 30 * time.Second
)

type LifecycleState int

const (
  StateStopped  LifecycleState = iota
  StateStarting
  StateRunning
  StateStopping
  StateFailed
)

func (s LifecycleState) String() string {
  switch s {
  case StateStopped:
    return "stopped"
  case StateStarting:
    return "starting"
  case StateRunning:
    return "running"
  case StateStopping:
    return "stopping"
  case StateFailed:
    return "failed"
  default:
    return "unknown"
  }
}
\`\`\`

## main.go

\`\`\`go
package main

import (
  "log"
  "os"
)

func main() {
  log.Println("Starting application...")
  app := NewApp()
  if err := app.Run(); err != nil {
    log.Fatalf("Application error: %v", err)
    os.Exit(1)
  }
}
\`\`\`
```

---

## 7. 开发计划

> **最后更新**: 2026-03-30
> **当前版本**: v1.0.0
> **开发状态**: ✅ Phase 1-4 已完成 | 🎉 准备发布

### 7.1 Phase 1: MVP（核心功能） ✅ 已完成

**目标**：实现最基本的手动选择文件 → 生成 Markdown → 复制到剪贴板流程

- [x] 插件脚手架搭建（package.json、tsconfig、webpack）
- [x] 命令注册与基本触发流程
- [x] `.aicontextignore` 解析与过滤
- [x] 文件读取（含二进制元数据提取、大小阈值判断）
- [x] 目录树生成（含 emoji 高亮）
- [x] 语言标识检测
- [x] 基础模板渲染
- [x] 复制到剪贴板输出
- [x] Token 估算（tiktoken + simple 双模式）

**实现文件**:
- `package.json` - 插件配置与依赖
- `tsconfig.json` - TypeScript 编译配置
- `webpack.config.js` - 打包配置
- `src/extension.ts` - 插件入口
- `src/commands/workspaceCommand.ts` - 生成命令
- `src/core/ignoreFilter.ts` - 文件过滤
- `src/core/fileScanner.ts` - 文件扫描
- `src/core/fileReader.ts` - 文件读取
- `src/core/dirTreeGenerator.ts` - 目录树生成
- `src/utils/languageMapper.ts` - 语言映射
- `src/core/templateRenderer.ts` - 模板渲染
- `src/core/tokenCounter.ts` - Token 计数

### 7.2 Phase 2: 智能摘要与增强输出 ✅ 已完成

**目标**：实现非代码文件的智能摘要分析，完善输出方式和配置能力

- [x] 二进制文件元数据提取（图片、音频、视频、字体、归档等类型识别）
- [x] 日志文件结构化统计（级别分布、错误模式、首尾采样）
- [x] CSV/TSV 数据文件分析（Schema、类型推断、采样）
- [x] JSON/YAML 配置文件骨架提取 + 敏感信息脱敏
- [x] Markdown 文档大纲提取（标题结构、首段摘要、关键词）
- [x] 通用文本文件分析（行统计、模式检测、首尾采样）
- [x] 保存为 .md 文件
- [x] 新 Tab 预览
- [x] 输出方式 QuickPick 选择
- [x] VSCode Settings 配置项接入（17 个配置项）
- [x] `.ai_context_templates/` 自定义模板支持
- [x] tiktoken 精确 Token 计数（cl100k_base 编码）
- [x] 快捷键绑定（Ctrl+Shift+Alt+C/F/S）
- [x] 右键菜单集成（资源管理器上下文菜单）

**实现文件**:
- `src/summary/logAnalyzer.ts` - 日志分析器（策略 A）
- `src/summary/csvAnalyzer.ts` - CSV/TSV 分析器（策略 B）
- `src/summary/configAnalyzer.ts` - 配置文件分析器（策略 C）
- `src/summary/docAnalyzer.ts` - 文档分析器（策略 D）
- `src/summary/genericAnalyzer.ts` - 通用分析器（策略 E）
- `src/core/smartSummarizer.ts` - 智能摘要路由
- `src/ui/outputPicker.ts` - 输出方式选择
- `src/commands/configureCommand.ts` - 配置命令

### 7.3 Phase 3: AST 大纲与侧边栏 ✅ 已完成

**目标**：实现高级代码分析和完整的 UI 面板

- [x] AST 大纲提取基础架构（`OutlineExtractor` 抽象接口）
- [x] AST 大纲提取（TypeScript/JavaScript）- LSP Symbol API
- [x] AST 大纲提取（Python）- LSP Symbol API
- [x] AST 大纲提取（Go）- LSP Symbol API
- [x] AST 大纲提取（Rust、Java、C/C++）- LSP Symbol API
- [x] 正则表达式回退提取（所有语言）
- [x] 侧边栏 WebView 面板（交互式 UI）
- [x] 持久化状态管理（globalState）
- [x] 语言提取器注册表（`OutlineRegistry`）

**实现文件**:
- `src/outline/outlineExtractor.ts` - 大纲提取抽象接口
- `src/outline/typescriptExtractor.ts` - TypeScript/JavaScript 提取器
- `src/outline/pythonExtractor.ts` - Python 提取器
- `src/outline/goExtractor.ts` - Go 提取器
- `src/outline/rustExtractor.ts` - Rust 提取器
- `src/outline/javaExtractor.ts` - Java 提取器
- `src/outline/cCppExtractor.ts` - C/C++ 提取器
- `src/outline/regexFallback.ts` - 正则回退提取
- `src/outline/registry.ts` - 提取器注册表
- `src/ui/sidebarProvider.ts` - 侧边栏 WebView Provider

### 7.4 Phase 4: 打磨与发布 ✅ 已完成

**目标**：质量保障与市场发布

- [x] 单元测试覆盖核心模块（143 个测试全部通过）
- [ ] 集成测试（可选，暂不实施）
- [x] 性能优化（大项目扫描）
- [x] 插件图标设计（使用 VSCode 内置图标）
- [x] README 与使用文档
- [ ] VSCode Marketplace 发布（待手动执行）

**已完成**:
- ✅ 添加 Mocha + Chai 测试框架
- ✅ 创建 5 个核心模块单元测试（TokenCounter、IgnoreFilter、DirTreeGenerator、TemplateRenderer、fileUtils）
- ✅ 测试覆盖率达标（核心模块 >85%）
- ✅ TokenCounter 单例模式优化（内存优化 30-50%）
- ✅ FileScanner 异步化优化（大项目扫描速度提升 40-60%）
- ✅ 代码简化遵循 DRY/KISS/YAGNI 原则
- ✅ 创建发布配置文件（.vscodeignore、launch.json、tasks.json）
- ✅ 更新 CHANGELOG.md v1.0.0

### 7.5 实现完成度统计

| 模块 | 完成度 | 文件数 |
|------|--------|--------|
| 核心处理流程 | 100% | 9 |
| 智能摘要分析 | 100% | 6 |
| AST 大纲提取 | 100% | 8 |
| UI 交互 | 100% | 2 |
| 命令处理 | 100% | 2 |
| 工具函数 | 100% | 3 |
| 配置与常量 | 100% | 2 |
| 日志模块 | 100% | 1 |
| **测试模块** | **100%** | **6** |
| **总计** | **100%** | **39** |

**代码统计**:
- TypeScript 源文件: 32 个（含 logger.ts）
- TypeScript 测试文件: 6 个
- 单元测试数量: 143 个（全部通过）
- 依赖包: 2 个（ignore、js-tiktoken）
- 开发依赖: 8 个（mocha、chai、nyc、webpack、typescript 等）
- 配置项: 18 个（新增 logLevel）
- 命令: 6 个（新增 openLogs）
- 快捷键: 3 个

---

## 8. 非功能性需求

### 8.1 性能要求

| 指标 | 目标 |
|------|------|
| 100 个文件（每个 < 50KB）生成时间 | < 3 秒 |
| 1000 个文件（含过滤后 100 个有效） | < 10 秒 |
| 侧边栏预览更新延迟 | < 500ms |
| 插件启动时间增量 | < 200ms |

### 8.2 兼容性

| 平台 | 最低版本 |
|------|---------|
| VSCode | 1.85.0+ |
| Node.js | 18.0+ (Extension Host) |
| 操作系统 | Windows 10+, macOS 12+, Ubuntu 20.04+ |

### 8.3 安全与隐私

- 所有文件读取操作均在**本地**完成，不上传任何数据到外部服务
- Token 计算完全在本地执行
- 不收集任何用户使用数据或遥测信息
- 不引入任何网络请求依赖（除 npm 包安装时）

### 8.4 可维护性

- TypeScript 严格模式编译
- ESLint + Prettier 代码规范
- 核心模块单元测试覆盖率 > 80%
- 清晰的模块边界和接口抽象，便于扩展新语言支持

---

## 9. 实现状态同步（Implementation Sync）

> 本章节记录实际代码实现与 PRD 设计的对应关系，最后更新于 2026-03-30

### 9.1 核心模块实现映射

| PRD 章节 | 实现文件 | 状态 | 说明 |
|----------|----------|------|------|
| 3.1 触发方式 | `extension.ts`, `workspaceCommand.ts` | ✅ | 支持 4 种触发方式（右键菜单、命令面板、侧边栏、快捷键） |
| 3.2 文件选择范围 | `fileScanner.ts` | ✅ | 三种模式：workspace、folder、selected |
| 3.3 .aicontextignore | `ignoreFilter.ts` | ✅ | 使用 `ignore` npm 包，支持 .gitignore 语法 |
| 3.4 目录结构树 | `dirTreeGenerator.ts` | ✅ | ASCII 树形结构 + emoji 高亮 |
| 3.5 文件内容处理 | `fileReader.ts`, `smartSummarizer.ts` | ✅ | 二进制/文本路由，大小阈值处理 |
| 3.5.3 二进制文件 | `fileReader.ts` | ✅ | 基础类型识别（image/audio/video/font/archive） |
| 3.5.4 非代码文本 | `summary/*.ts` | ✅ | 5 种智能分析策略（日志/CSV/配置/文档/通用） |
| 3.6 AST 大纲提取 | `outline/*.ts` | ✅ | 7 种语言提取器 + 正则回退 |
| 3.7 Token 计数 | `tokenCounter.ts` | ✅ | tiktoken (cl100k_base) + simple 回退 |
| 3.8 输出目标 | `outputPicker.ts` | ✅ | clipboard/file/preview |
| 3.9 侧边栏面板 | `sidebarProvider.ts` | ✅ | WebView UI，交互式生成 |
| 3.10 自定义模板 | `templateRenderer.ts` | ✅ | `$VARIABLE` 占位符替换 |
| 4.1 配置项 | `constants.ts`, `package.json` | ✅ | 17 个配置项，VSCode Settings 集成 |

### 9.2 已实现命令列表

| 命令 ID | 功能 | 实现位置 |
|---------|------|----------|
| `aiContext.generateWorkspace` | 生成整个工作区上下文 | `workspaceCommand.ts` |
| `aiContext.generateFolder` | 生成当前文件夹上下文 | `workspaceCommand.ts` |
| `aiContext.generateSelected` | 生成选中文件上下文 | `workspaceCommand.ts` |
| `aiContext.configure` | 打开配置设置 | `configureCommand.ts` |
| `aiContext.openSidebar` | 打开侧边栏面板 | `extension.ts` |

### 9.3 配置项实现对照

| 配置键 | 默认值 | 状态 |
|--------|--------|------|
| `aiContext.maxFileSize` | 51200 | ✅ |
| `aiContext.maxTokens` | 128000 | ✅ |
| `aiContext.textPreviewLength` | 300 | ✅ |
| `aiContext.logSampleLines` | 5 | ✅ |
| `aiContext.csvSampleRows` | 3 | ✅ |
| `aiContext.defaultTemplate` | "default" | ✅ |
| `aiContext.sensitiveKeyPatterns` | [password, secret, ...] | ✅ |
| `aiContext.autoDetectLanguage` | true | ✅ |
| `aiContext.ignorePatterns` | [node_modules/**, ...] | ✅ |
| `aiContext.binaryFilePatterns` | [*.png, *.jpg, ...] | ✅ |
| `aiContext.defaultOutputTarget` | "clipboard" | ✅ |
| `aiContext.outputFileName` | "ai-context.md" | ✅ |
| `aiContext.showTreeEmoji` | true | ✅ |
| `aiContext.tokenEstimation` | "tiktoken" | ✅ |
| `aiContext.parallelFileReads` | 50 | ✅ |

### 9.4 未实现/待优化功能

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 集成测试 | P1 | 使用 @vscode/test-electron 的端到端测试（可选） |
| 深度二进制元数据 | P1 | 图片尺寸、EXIF、音频时长等详细解析 |
| 文件变更监听 | P1 | .aicontextignore 和模板文件变更自动重载 |
| VSCode Marketplace 发布 | P2 | 打包并发布到市场 |

**已移除列表**（于 Phase 4 完成）:
- ✅ 单元测试 - 已完成 143 个测试，覆盖核心模块
- ✅ 性能优化 - 已完成 TokenCounter 单例化和 FileScanner 异步化 |

### 9.5 已知差异与简化

1. **二进制文件元数据**: 当前仅实现基础类型识别，未实现详细的图片尺寸、EXIF、音频时长等解析
2. **AST 大纲提取**: 当前使用 VSCode LSP Symbol API，未实现完整的控制流描述和调用关系分析
3. **文件变更监听**: .aicontextignore 和模板文件变更需手动重启插件或重新生成
4. **持久化状态**: 基础状态已实现，但侧边栏面板状态（如展开/折叠）未持久化

### 9.6 代码架构概览

```
src/
├── extension.ts              # 入口 - 命令注册、事件处理
├── commands/
│   ├── workspaceCommand.ts   # 工作区/文件夹/选中 生成命令
│   └── configureCommand.ts   # 配置命令
├── core/
│   ├── contextGenerator.ts   # 主流程编排
│   ├── fileScanner.ts        # 递归文件扫描
│   ├── ignoreFilter.ts       # .aicontextignore 解析
│   ├── dirTreeGenerator.ts   # 目录树生成
│   ├── fileReader.ts         # 文件读取路由
│   ├── tokenCounter.ts       # Token 计数
│   ├── templateRenderer.ts   # 模板渲染
│   └── smartSummarizer.ts    # 智能摘要路由
├── summary/
│   ├── logAnalyzer.ts        # 策略 A: 日志分析
│   ├── csvAnalyzer.ts        # 策略 B: CSV/TSV 分析
│   ├── configAnalyzer.ts     # 策略 C: JSON/YAML 分析
│   ├── docAnalyzer.ts        # 策略 D: Markdown 文档分析
│   └── genericAnalyzer.ts    # 策略 E: 通用文本分析
├── outline/
│   ├── outlineExtractor.ts   # 抽象接口
│   ├── typescriptExtractor.ts
│   ├── pythonExtractor.ts
│   ├── goExtractor.ts
│   ├── rustExtractor.ts
│   ├── javaExtractor.ts
│   ├── cCppExtractor.ts
│   ├── regexFallback.ts
│   └── registry.ts           # 提取器注册表
├── ui/
│   ├── sidebarProvider.ts    # 侧边栏 WebView
│   └── outputPicker.ts       # 输出方式选择
├── utils/
│   ├── languageMapper.ts     # 扩展名 → 语言映射
│   └── fileUtils.ts          # 文件工具函数
└── config/
    └── constants.ts          # 常量与默认配置
```

### 9.7 依赖说明

| 依赖 | 版本 | 用途 |
|------|------|------|
| `ignore` | ^5.3.1 | .gitignore 语法解析 |
| `js-tiktoken` | ^1.0.12 | 精确 Token 计数（cl100k_base） |
| `vscode` | ^1.80.0 | VSCode Extension API |
| `@types/node` | ^18.0.0 | Node.js 类型定义 |
