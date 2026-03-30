# AI Context Generator - 架构设计文档

## 核心数据流

```
用户交互 → 命令层 → 编排层 → 处理层 → 输出层
   ↓         ↓       ↓       ↓       ↓
extension  generate  context  scan    template
   ↓         ↓       ↓       ↓       ↓
  VSCode   command  file     ignore   variable
   API      handler  scanner  filter  substitutor
                     ↓       ↓
                    reader   tree
                    ↓       ↓
                   outline  token
                   ↓       ↓
                  summary  counter
```

## 模块职责边界

### 入口层 (`src/extension.ts`)
- 唯一 VSCode 扩展入口点
- 注册命令、初始化 Logger
- 不处理业务逻辑，仅做委托

### 命令层 (`src/commands/`)
- `generateCommand.ts`: URI 规范化、输出目标路由、进度包装
- `configureCommand.ts`: 设置 UI 简化入口
- `ignoreFileCommand.ts`: `.aicontextignore` 文件生成器

**关键决策**: 命令层不直接调用底层 API，通过 `ContextGenerator` 编排

### 核心编排层 (`src/core/contextGenerator.ts`)

**核心协调器**: 单一职责，协调 7 个步骤:
1. 文件扫描 → FileScanner
2. 树根计算 → findCommonParent()
3. 内容读取 → FileReader
4. 目录树生成 → DirTreeGenerator
5. 文件处理 → processFiles() → SmartSummarizer / OutlineExtractorRegistry
6. Token 计算 → TokenCounter
7. 模板渲染 → TemplateRenderer

**配置热更新**:
- `reloadFromSettings()`: 动态从 VSCode 配置读取
- `updateConfig()`: 程序化配置更新
- `refreshDependents()`: 重建依赖组件 (FileReader, SmartSummarizer, TokenCounter)

### 过滤层 (`src/core/ignoreFilter.ts`)

**双模式过滤**:
1. 文件级: `isIgnored(filePath)`
2. 目录级: `isDirectoryIgnored(dirPath)` (额外检查 `/` 后缀)

**三层模式合并**:
```
.aicontextignore (项目级) > aiContext.ignorePatterns (全局) > binaryFilePatterns (内置)
```

**reload() 陷阱**: `binaryPatterns` 通过可空参数更新，需使用 `length = 0; push(...)` 避免引用共享

### 扫描层 (`src/core/fileScanner.ts`)

**双路径支持**:
- 全工作区扫描: `scanDirectoryAsync()` (递归，maxDepth=100)
- 选中路径扫描: `scanSelectedPaths()` (单层/多层混合)

**异常处理策略**:
- 目录访问失败 → 跳过，skipped++
- 文件不可读 → 跳过，skipped++
- 始终返回 ScanResult，不抛出

### 读取层 (`src/core/fileReader.ts`)

**智能分类器**:
```
fs.statSync() → size > maxFileSize? → isBinaryFile() → 分支:
  ├─ 二进制 → extractBinaryMetadata() → formatBinaryMetadata()
  └─ 文本 → readFileContent() → formatFileContent()
```

**并发控制**: `parallelFileReads` 配置批次大小 (默认 50)

**二进制检测**:
- 扩展名匹配 (`binaryFilePatterns`)
- 无扩展名 → 内容检测 (读取前 1KB，检查 null 字节)

### 总结层 (`src/core/smartSummarizer.ts`)

**扩展名路由器**:
```
.log → LogAnalyzer      (日志级别分布、错误采样)
.csv/.tsv → CsvAnalyzer   (模式推断、类型检测)
.json/.yaml → ConfigAnalyzer (结构骨架、敏感数据脱敏)
.md/.txt → DocAnalyzer     (标题大纲、关键词提取)
其他 → GenericAnalyzer  (代码结构、文本预览)
```

### 大文件处理策略 (`src/core/contextGenerator.ts:142-169`)

```
文件大小 > 50KB (isTruncated=true)?
├─ 是 → 语言支持 AST? → OutlineExtractorRegistry.extractOutline()
│       └─ 否 → SmartSummarizer.summarize()
└─ 否 → SmartSummarizer.shouldSummarize()? → 是/否
```

### Token 计数层 (`src/core/tokenCounter.ts`)

**双重模式**:
- `tiktoken`: 使用 `js-tiktoken` (cl100k_base 编码，全局单例缓存)
- `simple`: 降级方案 `Math.ceil(length / 3.75)`

**全局编码缓存**: `cachedEncoding` (模块级单例，跨实例共享)

### 提取层 (`src/outline/registry.ts`)

**三级提取策略**:
```
ASTExtractor (LSP DocumentSymbol) → Basic OutlineExtractor (LSP SymbolInformation) → RegexFallback
        ↓ (层次结构)                    ↓ (扁平)                      ↓ (正则)
    types/functions              types/imports              types/functions/imports
```

**缓存机制**:
- LRU 淘汰策略 (`cacheAccessOrder` 数组)
- TTL: 5 分钟
- 容量: 100 条
- 缓存键: `${uri}:${version}:${optionsStr}`

### 模板层 (`src/core/templateRenderer.ts`)

**变量替换**: `$KEY_NAME` → split/join (非正则，避免转义地狱)

**自定义模板发现**: `.ai_context_templates/*.md` (自动扫描)

### 日志层 (`src/core/logger.ts`)

**单例模式**: 全局 `logger` 实例
**双输出**: VSCode OutputChannel + Console
**级别过滤**: DEBUG < INFO < WARN < ERROR

## 关键依赖关系

### 隐性依赖
1. `ContextGenerator` → `IgnoreFilter` → `FileScanner` (构造器注入链)
2. `FileReader` → `BinaryMetadataExtractor` (组合)
3. `OutlineExtractorRegistry` → `ASTExtractor` → `OutlineExtractor` (继承链)

### 状态流转
```
用户选择路径 → generateCommand → ContextGenerator.generate()
                                                    ↓
                                            FileScanner.scan()
                                                    ↓
                                            FileReader.readFiles()
                                                    ↓
                                            SmartSummarizer.summarize()
                                                    ↓
                                            TemplateRenderer.render()
                                                    ↓
                                            outputResult() → VSCode API
```

## 配置传播路径

```
VSCode Settings.json → aiContext.* → ContextGenerator.reloadFromSettings()
                                          ↓
                                    updateConfig()
                                          ↓
                                    refreshDependents()
                                          ↓
                    ┌─────────────────┴──────────────────┐
                    ↓                                    ↓
            FileReader.reload()              SmartSummarizer (new)
            TokenCounter (new)
```
