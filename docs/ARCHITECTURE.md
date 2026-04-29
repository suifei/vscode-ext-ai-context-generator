# AI Context Generator - 架构设计

## 核心数据流

```
用户触发 → 命令路由 → 上下文生成 → 结果输出
   ↓          ↓          ↓           ↓
extension  commands  contextGen  clipboard/file/preview
   ↓          ↓          ↓           ↓
VSCode API  normalize  7步流水线    withProgress
                       ↓
                  ┌─────┴─────┐
                  ↓           ↓
              文件发现      内容处理
                  ↓           ↓
              scanner      reader
                            ↓
                         ┌───┴───┐
                         ↓       ↓
                      二进制    文本
                         ↓       ↓
                      metadata  outline/summary
                                  ↓
                               template
                                  ↓
                               render
```

## 模块职责

### 入口 (`extension.ts`)

- 注册 7 个命令到 VSCode
- 初始化 Logger 单例
- 显示欢迎消息（首次）

### 命令层 (`commands/`)


| 文件                                     | 职责                                     |
| -------------------------------------- | -------------------------------------- |
| `generateCommand.ts`                   | URI 规范化、输出路由、进度包装、错误处理                 |
| `ignoreFileCommand.ts`                 | 生成 `.aicontextignore`（合并 `.gitignore`） |
| `toggleLargeFileDegradationCommand.ts` | 切换大文件降级开关                              |
| `configureCommand.ts`                  | 快速配置入口                                 |


**关键函数**:

- `normalizeUris()`: 多选参数优先级 `selectedFiles > uri`
- `executeGeneration()`: 进度回调包装，隔离错误处理

### 核心编排 (`core/contextGenerator.ts`)

**单次生成流水线**（`generate()` 方法）:

```
1. FileScanner.scan()        → 发现文件
2. findCommonParent()         → 计算树根
3. FileReader.readFiles()    → 读取内容
4. DirTreeGenerator.generate() → 生成目录树
5. processFiles()             → 处理大文件
6. TokenCounter.count()       → 计算 Token
7. TemplateRenderer.render()  → 渲染输出
```

**配置热更新**:

```
reloadFromSettings() → updateConfig() → refreshDependents()
                                          ↓
                            ┌─────────────┴─────────────┐
                            ↓                           ↓
                    new FileReader              new SmartSummarizer
                    new TokenCounter
```

### 过滤层 (`core/ignoreFilter.ts`)

**三层模式合并**:

```
.gitignore (自动读取) > .aicontextignore (项目) > aiContext.ignorePatterns (全局)
```

`binaryFilePatterns` 属于读取层的二进制识别配置，不参与扫描忽略。

**路径规范化**: `toNormalizedPath()` → Windows `\` 转 `/`

### 扫描层 (`core/fileScanner.ts`)

**双模式扫描**:

- 全工作区: `scanDirectoryAsync()` 递归（maxDepth=100）
- 选中路径: `scanSelectedPaths()` 智能处理文件/文件夹混合

**容错策略**: 访问失败 → 跳过 → `skipped++`

### 读取层 (`core/fileReader.ts`)

**文件分类决策树**:

```
fs.statSync()
    ↓
size > maxFileSize AND enableLargeFileDegradation?
    ↓ Yes                              ↓ No
isBinaryFile()?                    isBinaryFile()?
    ↓ Yes        ↓ No                   ↓ Yes    ↓ No
metadata    content(full)          metadata  content(full)
```

**并发控制**: `parallelFileReads` 批次大小（默认 50，运行时最小钳制为 1）

### 大文件降级策略 (`contextGenerator.ts:processFiles()`)

```
isTruncated == true?
    ↓ Yes
语言支持提取（TS/JS 为 Compiler API 语义，其他为 LSP/符号）?
    ↓ Yes              ↓ No
registry.extractOutline   SmartSummarizer.summarize()
```

### 摘要路由 (`core/smartSummarizer.ts`)


| 扩展名                | Analyzer        | 输出          |
| ------------------ | --------------- | ----------- |
| `.log`             | LogAnalyzer     | 级别分布、错误采样   |
| `.csv/.tsv`        | CsvAnalyzer     | 模式推断、类型检测   |
| `.json/.yaml/.xml` | ConfigAnalyzer  | 结构骨架、敏感数据脱敏 |
| `.md/.txt`         | DocAnalyzer     | 标题大纲、关键词    |
| 其他                 | GenericAnalyzer | 代码结构、文本预览   |


### 提取层 (`outline/`)

**TS / JS 降级链**:

```
TypeScriptSemanticExtractor (Compiler API，函数级语义摘要)
    ↓ 失败或无效
LspOutlineExtractor (DocumentSymbol，层次符号)
    ↓ 失败
OutlineExtractor (SymbolInformation，扁平符号)
    ↓ 失败
RegexFallback (正则兜底)
```

TS/JS 语义大纲的**字段顺序（v1.3：`io` / `dep` / `ctl` / `flow` / `path`）及 token 约定**见 [SEMANTIC-OUTLINE-SPEC.md](./SEMANTIC-OUTLINE-SPEC.md)。

**其他语言**:

```
LspOutlineExtractor → OutlineExtractor → RegexFallback
```

**缓存机制**:

- LRU 淘汰（`cacheAccessOrder` 数组）
- TTL: 5 分钟
- 容量: 100 条
- 缓存键: `${uri}:${version}:${optionsStr}`

### 模板层 (`core/templateRenderer.ts`)

**变量替换**: `split('$KEY').join(value)` 避免正则转义

**自定义模板**: `.ai_context_templates/*.md` 自动发现

### 工具层 (`utils/`)


| 文件                    | 职责                                      |
| --------------------- | --------------------------------------- |
| `fileUtils.ts`        | 文件大小格式化、相对路径、路径规范化、代码文件检测               |
| `errorUtils.ts`       | 错误消息提取（统一错误处理）                          |
| `gitUtils.ts`         | `.gitignore` 读取（与 ignoreFileCommand 共享） |
| `languageMapper.ts`   | 扩展名 → 语言 ID                             |
| `languagePatterns.ts` | 代码分析正则模式                                |


## 关键依赖图

```
extension.ts
    ↓
commands/generateCommand.ts
    ↓
core/contextGenerator.ts
    ├─→ core/fileScanner.ts → core/ignoreFilter.ts
    ├─→ core/fileReader.ts → core/binaryMetadataExtractor.ts
    ├─→ core/dirTreeGenerator.ts
    ├─→ core/tokenCounter.ts
    ├─→ core/templateRenderer.ts
    └─→ core/smartSummarizer.ts
          ├─→ summary/logAnalyzer.ts
          ├─→ summary/csvAnalyzer.ts
          ├─→ summary/configAnalyzer.ts
          ├─→ summary/docAnalyzer.ts
          └─→ summary/genericAnalyzer.ts

outline/registry.ts
    ├─→ outline/typescriptSemanticExtractor.ts (TS/JS 优先)
    ├─→ outline/astExtractor.ts (LspOutlineExtractor) → outline/outlineExtractor.ts
    └─→ outline/regexFallback.ts → outline/outlineExtractor.ts
```

## 配置传播路径

```
VSCode Settings.json
    ↓
contextGenerator.reloadFromSettings()
    ↓
contextGenerator.updateConfig()
    ↓
contextGenerator.refreshDependents()
    ↓
├─→ new FileReader(config, workspaceRoot)
└─→ new SmartSummarizer(config, workspaceRoot)
```

