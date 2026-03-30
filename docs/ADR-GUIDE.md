# ADR-GUIDE.md - 架构决策与避坑指南

## 核心决策

### ADR-01: 多选文件参数优先级

**决策**: VSCode 右键菜单多选使用**第二个参数** `selectedFiles`

```typescript
// generateCommand.ts
function normalizeUris(
  selectedUri: vscode.Uri | vscode.Uri[] | undefined,
  selectedFiles?: vscode.Uri[]
): vscode.Uri[] | undefined {
  if (selectedFiles && selectedFiles.length > 0) return selectedFiles;
  // ... fallback to selectedUri
}
```

**理由**: VSCode 资源管理器多选时，`uri` 参数为单选项，`selectedFiles` 为全集

**陷阱**: 忽略 `selectedFiles` 会导致多选时只处理第一个文件

---

### ADR-02: 大文件处理三级降级

**决策**: AST DocumentSymbol → Basic SymbolInformation → Regex

```typescript
// registry.ts
if (SUPPORTED_LANGUAGES.has(languageId)) {
  result = await astExtractor.extract();  // 层次结构
  if (!isValidOutline(result)) {
    result = await basicExtractor.extract();  // 扁平结构
  }
}
if (!isValidOutline(result)) {
  result = await regexFallback.extract();  // 正则
}
```

**验证条件**: `/^\/\/\s+(TYPES|FUNCTIONS|IMPORTS)/m.test(outline) && outline.length >= 50`

**陷阱**: LSP 未安装时 DocumentSymbol 返回空，必须降级

---

### ADR-03: 路径规范化强制 `/` 分隔符

**决策**: `ignore` 库要求 Unix 风格路径

```typescript
// ignoreFilter.ts:67-70
private toNormalizedPath(filePath: string): string {
  const relativePath = path.relative(this.workspaceRoot, filePath);
  return relativePath.split(path.sep).join('/');
}
```

**陷阱**: Windows 路径 `\` 会被 `ignore` 库拒绝匹配

---

### ADR-04: 模板变量替换避免正则

**决策**: `split()` + `join()` 替代正则替换

```typescript
// templateRenderer.ts:34-37
for (const [key, value] of Object.entries(variables)) {
  const placeholder = `$${key}`;
  result = result.split(placeholder).join(value || '');
}
```

**理由**: 避免 `$` 特殊字符转义地狱

**陷阱**: 使用 `String.replaceAll()` 或 `/\\$\w+/g` 需要转义 `$`

---

### ADR-05: Token 计数双模式降级

**决策**: tiktoken（精确） → simple（字符/3.75）

```typescript
// tokenCounter.ts
if (this.mode === 'tiktoken') {
  try {
    return this.countWithTiktoken(text);
  } catch {
    this.mode = 'simple';  // 自动降级
  }
}
return Math.ceil(text.length / 3.75);
```

**缓存策略**: 全局单例 `cachedEncoding` 跨实例共享

**陷阱**: `js-tiktoken` 在某些环境加载失败，必须捕获异常

---

### ADR-06: 二进制检测内容扫描

**决策**: 无扩展名文件读取前 1KB 检查 null 字节

```typescript
// fileReader.ts:156-168
private checkContentIsBinary(filePath: string): boolean {
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(1024);
  fs.readSync(fd, buffer, 0, 1024, 0);
  return buffer.includes(0);  // null 字节 = 二进制
}
```

**陷阱**: 读取 1KB 可能失败（权限/锁），异常时返回 `true` 跳过

---

### ADR-07: 目录树深度限制

**决策**: 默认 `maxDepth = 100`

**理由**: 防止无限递归，实际项目极少超过

**位置**: `dirTreeGenerator.ts:24`, `fileScanner.ts:40`

---

### ADR-08: 并发读取批次控制

**决策**: `parallelFileReads = 50` 批次大小

```typescript
// fileReader.ts:91-97
for (let i = 0; i < filePaths.length; i += concurrency) {
  const batch = filePaths.slice(i, i + concurrency);
  const batchResults = await Promise.all(
    batch.map(p => this.safeReadFile(p))
  );
  results.push(...batchResults);
}
```

**陷阱**: 全部并发会导致 EMFILE 错误（文件描述符耗尽）

---

### ADR-09: Outline 缓存 LRU 策略

**决策**: 容量 100，TTL 5 分钟

```typescript
// registry.ts:136-154
if (this.cache.size >= this.MAX_CACHE_SIZE && !this.cache.has(key)) {
  const oldestKey = this.cacheAccessOrder.shift();  // 淘汰最老
  this.cache.delete(oldestKey);
}
```

**缓存键**: `${uri}:${version}:${optionsStr}`

**陷阱**: Document 版本变化缓存失效，必须包含 version

---

### ADR-10: IgnoreFilter reload 引用陷阱

**决策**: 使用 `length = 0; push(...)` 清空数组

```typescript
// ignoreFilter.ts:42-45
if (binaryPatterns) {
  this.binaryPatterns.length = 0;  // 必须
  this.binaryPatterns.push(...binaryPatterns);
}
```

**陷阱**: 直接 `this.binaryPatterns = binaryPatterns` 会导致多个实例共享引用

---

## 边界陷阱

### 1. VSCode LSP 不可用

**场景**: 用户未安装对应语言扩展

**防御**: Registry 三级降级至 Regex

---

### 2. 文件读取权限错误

**场景**: `fs.readFileSync()` 抛出异常

**防御**: `safeReadFile()` 捕获返回错误占位符

---

### 3. 工作区根目录获取

**场景**: 单文件打开无工作区

**防御**: `vscode.workspace.workspaceFolders?.[0]?.uri.fsPath` 空值检查

---

### 4. 模板变量缺失

**场景**: 用户模板使用未定义变量

**防御**: `value || ''` 空字符串替换

---

### 5. 目录访问失败

**场景**: 符号链接/权限问题

**防御**: `scanDirectoryAsync` try-catch 跳过，`skipped++`

---

## 资源管理

### OutlineExtractorRegistry.clearCache()

**调用时机**: 配置变更、大量文件处理完成

**防止**: 内存泄漏（缓存 100 条 × 大文件 outline）

---

### ContextGenerator.dispose()

**调用时机**: 命令执行完成

**清理**: Logger 调试日志，无需显式释放（无长连接）

---

## 并发安全

### FileReader 并发限制

**问题**: `Promise.all()` 可能导致 EMFILE

**解决**: 批次控制（默认 50）

---

### IgnoreFilter 状态共享

**问题**: `reload()` 修改运行时状态

**现状**: 单线程无竞态，无需锁
