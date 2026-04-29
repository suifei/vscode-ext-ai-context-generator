# 语义大纲抽样评估报告

- 生成时间: 2026-04-29T16:27:12.413Z
- Git: 3506bc6
- 规格: [docs/SEMANTIC-OUTLINE-SPEC.md](../SEMANTIC-OUTLINE-SPEC.md)
- 格式: **semantic DSL v1.3**（无逐行 `//`；`io` / `dep` / `ctl` / `flow` / `path`）
- 选项: standard + extractComments；样本见下表

## 样本指标速览

| 文件 | 字符 | ~tokens† | 行数 | fn | dep最长行 | path行 | flow块 | logFlow | dep输出重叠 | 空ctl |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `src/core/contextGenerator.ts` | 1484 | 424 | 37 | 7 | 257 | 0 | 5 | 4 | 0 | 0 |
| `src/outline/registry.ts` | 1104 | 316 | 24 | 4 | 106 | 0 | 2 | 1 | 0 | 0 |
| `src/commands/generateCommand.ts` | 3837 | 1097 | 88 | 14 | 192 | 4 | 5 | 8 | 0 | 0 |

† ~tokens = ⌈字符数 / 3.5⌉（粗估，便于与 tiktoken 对照）。

## 原始提取输出

### src/core/contextGenerator.ts

```plaintext
── semantic · 7 fns · v1.3 ──
fn ContextGenerator.constructor(workspaceRoot, config?)
io: workspaceRoot: string, config?: Partial<AIContextConfig> -> void
dep: new FileReader, new FileScanner, new IgnoreFilter, new SmartSummarizer, new TemplateRenderer, new TokenCounter
flow:
  cfg: this.sanitizeConfig
  wire: IgnoreFilter → FileScanner → FileReader → TokenCounter → TemplateRenderer → SmartSummarizer

fn async ContextGenerator.generate(options)
io: options: GenerationOptions -> Promise<GenerationResult>
dep: contents.join, DirTreeGenerator.generate, this.buildTemporaryContent, this.emptyResult, this.fileReader.readFiles, this.fileScanner.scan, this.fileScanner.sortFiles, this.findCommonParent, this.processFiles, this.renderTemplate, this.tokenCounter.count
flow:
  if (files.length === 0) -> Logger.logScanStart -> Logger.warn -> return
  log: info
  <- return

fn ContextGenerator.updateConfig(config)
io: config: Partial<AIContextConfig> -> void
flow:
  := this.config ← this.sanitizeConfig
  -> this.ignoreFilter.reload
  -> this.refreshDependents

fn ContextGenerator.reloadFromSettings()
io: ∅ -> void
dep: this.loadConfigFromSettings, vscode.workspace.getConfiguration
flow:
  := this.config ← this.sanitizeConfig
  -> this.ignoreFilter.reload
  -> this.refreshDependents

fn ContextGenerator.getAvailableTemplates() -> string[] = this.templateRenderer.getAvailableTemplates

fn ContextGenerator.getMaxTokens() -> number

fn ContextGenerator.dispose()
flow: log: debug
```

_本段: 1484 字符, ~424 tokens_

### src/outline/registry.ts

```plaintext
── semantic · 4 fns · v1.3 ──
fn static async OutlineExtractorRegistry.extractOutline(document, options?)
doc: Extract outline from document using the best available method Extraction strategy: 1. TypeScriptSemanticExtractor…
io: document: vscode.TextDocument, options?: OutlineOptions -> Promise<string>
dep: document.languageId.toLowerCase, Logger.debug, this.getCacheKey, this.getFromCache, this.mergeOptions
ctl: 6br 0lp | if (cached) | if (this.TS_JS_LANGUAGES.has(languageId)) | if (this.isValidOutline(result)) | if (this.SUPPORTED_LANGUAGES.has(languageId))
flow:
  ctrl: branches×4
  cache? -> return
  try semanticExtractor -> cache -> return
  try lspExtractor -> cache -> return
  try basicExtractor -> cache -> return
  try regexFallback -> cache -> return

fn static OutlineExtractorRegistry.clearCache()
io: ∅ -> void
flow:
  -> this.cache.clear
  := this.cacheAccessOrder
  log: debug

fn static OutlineExtractorRegistry.hasSymbolSupport(languageId) -> boolean = this.SUPPORTED_LANGUAGES.has

fn static OutlineExtractorRegistry.hasASTSupport(languageId) -> boolean = this.hasSymbolSupport
```

_本段: 1104 字符, ~316 tokens_

### src/commands/generateCommand.ts

```plaintext
── semantic · 14 fns · v1.3 ──
fn normalizeUris(selectedUri, selectedFiles?)
doc: Normalize URI inputs to a consistent array format. Priority: selectedFiles (multi-selection) > selectedUri…
io: selectedUri: vscode.Uri|vscode.Uri[]|undefined, selectedFiles?: vscode.Uri[] -> vscode.Uri[]|undefined
flow:
  <- return · if (selectedFiles && selectedFiles.length > 0)
  <- return · if (Array.isArray(selectedUri))

fn async generateWithTarget(context, selectedUri, selectedFiles, outputTarget)
io: context: vscode.ExtensionContext, selectedUri: vscode.Uri|vscode.Uri[]|undefined, selectedFiles: vscode.Uri[]|undefined, outputTarget: OutputTarget -> Promise<void>
dep: Logger.*
ctl: 1br 0lp | if (!selectedPaths || selectedPaths.length === 0)
path: normalizeUris → getSelectedPaths → generateContext

fn export async generateToClipboard(context, selectedUri, selectedFiles?) = generateWithTarget

fn export async generateToFile(context, selectedUri, selectedFiles?) = generateWithTarget

fn export async generateToPreview(context, selectedUri, selectedFiles?) = generateWithTarget

fn export async generate(context, selectedUri, selectedFiles?)
doc: Main generate command - automatically determines scope from selection
io: context: vscode.ExtensionContext, selectedUri: vscode.Uri|vscode.Uri[]|undefined, selectedFiles?: vscode.Uri[] -> Promise<void>
dep: Logger.*
ctl: 1br 0lp | if (!selectedPaths || selectedPaths.length === 0)
path: normalizeUris → getSelectedPaths → generateContext

fn getSelectedPaths(uriFromExplorer?)
doc: Get selected file paths from explorer context or active editor
io: uriFromExplorer?: vscode.Uri|vscode.Uri[] -> string[]|undefined
dep: uriFromExplorer.map
ctl: 3br 0lp | if (uriFromExplorer)
flow:
  <- return · if (Array.isArray(uriFromExplorer))
  <- return · if (vscode.window.activeTextEditor)

fn async generateContext(context, options)
io: context: vscode.ExtensionContext, options: {selectedPaths:string[],outputTarget?:OutputTarget} -> Promise<void>
dep: Logger.*, vscode.window.*
ctl: 1br 0lp | if (!workspaceRoot)
path: getWorkspaceRoot → vscode.window.withProgress → executeGeneration

fn async executeGeneration(progress, workspaceRoot, options, startTime)
io: progress: {report:fn}, workspaceRoot: string, options: {selectedPaths:string[],outputTarget?:OutputTarget}, startTime: number -> Promise<void>
dep: generator.generate, generator.getMaxTokens, new ContextGenerator, outputResult, showOutputPicker
ctl: 2br 0lp | try/catch | if (!outputTarget)
flow:
  try {…}
    -> progress.report
    log: debug
    -> generator.reloadFromSettings
    log: debug, info
    -> generator.dispose
    <- return
    log: info
    -> progress.report
    log: logScanComplete, logTokenCount
    -> progress.report
    -> showResultMessage
    -> generator.dispose
    log: info

fn async outputResult(content, target, workspaceRoot)
io: content: string, target: OutputTarget, workspaceRoot: string -> Promise<void>
dep: config.get, encoder.encode, new TextEncoder, path.join, sanitizeOutputFileName, vscode.commands.executeCommand, vscode.Uri.file, vscode.window.*, vscode.workspace.*, vscode.workspace.fs.*
ctl: 3br 0lp | try/catch | if (confirm !== 'Overwrite')
flow:
  log: debug
  switch('clipboard'->vscode.env.clipboard.writeText,'file'->vscode.workspace.getConfiguration,'preview'->vscode.workspace.openTextDocument)
  try {…}
    log: info
    <- return
    log: info

fn sanitizeOutputFileName(fileName) -> string
path: fileName.trim → path.basename

fn showResultMessage(result)
io: result: GenerationResult -> void
dep: vscode.window.*
ctl: 1br 0lp | if (exceededLimit)
flow:
  -> vscode.window.showWarningMessage.then
  -> vscode.window.showInformationMessage

fn getWorkspaceRoot() -> string|undefined

fn async showOutputPicker() -> Promise<OutputTarget | undefined> = vscode.window.showQuickPick
```

_本段: 3837 字符, ~1097 tokens_

## 体量汇总

- 上述片段合计 **6425** 字符，粗估 **~1837** tokens（未含 Markdown 外壳）。

## Agent 评估维度（用于迭代）

| 维度 | 说明 |
|------|------|
| 锚点 | `fn` / `sym` / `io` 是否足以定位职责 |
| 依赖完整性 | `dep:` 是否覆盖主要协作对象（单行、无源码碎片） |
| 控制可读性 | `ctl:` 是否回答分叉/循环；弱 Flow 时 `path:` 是否补主路径 |
| 冗余度 | `flow` 与 `path` 是否重复堆砌 |
| Token 效率 | 相对全文是否显著压缩且信息密度高 |

### 本轮结论占位

> 由维护者在评审提取结果后填写；或通过 CI 将本节替换为摘要。
