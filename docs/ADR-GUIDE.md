# ADR-GUIDE.md - 架构决策与避坑指南

## 核心决策

### ADR-01: VSCode 多选参数优先级

**决策**: 多选时优先使用 `selectedFiles` 参数

```typescript
// generateCommand.ts
function normalizeUris(
  selectedUri: vscode.Uri | vscode.Uri[] | undefined,
  selectedFiles?: vscode.Uri[]
): vscode.Uri[] | undefined {
  if (selectedFiles && selectedFiles.length > 0) return selectedFiles;
  return Array.isArray(selectedUri) ? selectedUri : selectedUri ? [selectedUri] : undefined;
}
```

**理由**: 资源管理器多选时，`uri` 为单击项，`selectedFiles` 为全集

**陷阱**: 忽略 `selectedFiles` 会导致多选只处理第一个文件

---

### ADR-02: 大文件三级降级策略

**决策**: AST DocumentSymbol → Basic SymbolInformation → Regex

```typescript
// registry.ts
if (SUPPORTED_LANGUAGES.has(languageId)) {
  result = await astExtractor.extract();
}
if (!isValidOutline(result)) {
  result = await basicExtractor.extract();
}
if (!isValidOutline(result)) {
  result = await regexFallback.extract();
}
```

**验证**: `/^\/\/\s+(TYPES|FUNCTIONS|IMPORTS)/m.test(outline) && outline.length >= 50`

**陷阱**: LSP 未安装时 DocumentSymbol 返回空，必须降级

---

### ADR-03: ignore 库要求 Unix 风格路径

**决策**: 强制转换 Windows `\` 为 `/`

```typescript
// ignoreFilter.ts
private toNormalizedPath(filePath: string): string {
  const relativePath = path.relative(this.workspaceRoot, filePath);
  return normalizePathSeparators(relativePath);  // split(path.sep).join('/')
}
```

**陷阱**: Windows 路径会被 `ignore` 库拒绝匹配

---

### ADR-04: 模板变量替换避免正则

**决策**: `split()` + `join()` 替代正则

```typescript
// templateRenderer.ts
for (const [key, value] of Object.entries(variables)) {
  const placeholder = `$${key}`;
  result = result.split(placeholder).join(value || '');
}
```

**理由**: 避免 `$` 特殊字符转义地狱

**陷阱**: `replaceAll()` 或 `/\$\w+/g` 需要转义 `$`

---

### ADR-05: Token 计数双模式

**决策**: tiktoken（精确） → simple（字符/3.75）

```typescript
// tokenCounter.ts
if (this.mode === 'tiktoken' && this.encoding) {
  try {
    return this.encoding.encode(text).length;
  } catch {
    // 降级到 simple
  }
}
return Math.ceil(text.length / 3.75);
```

**缓存**: 全局单例 `cachedEncoding` 跨实例共享

**陷阱**: `js-tiktoken` 在某些环境加载失败

---

### ADR-06: 二进制检测内容扫描

**决策**: 无扩展名文件读取前 1KB 检查 null 字节

```typescript
// fileReader.ts
private checkContentIsBinary(filePath: string): boolean {
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(1024);
  fs.readSync(fd, buffer, 0, 1024, 0);
  return buffer.includes(0);
}
```

**陷阱**: 读取失败时返回 `true`（跳过）

---

### ADR-07: 目录树深度限制

**决策**: maxDepth = 100

**理由**: 防止无限递归，实际项目极少超过

---

### ADR-08: 并发读取批次控制

**决策**: parallelFileReads = 50

```typescript
// fileReader.ts
for (let i = 0; i < filePaths.length; i += concurrency) {
  const batch = filePaths.slice(i, i + concurrency);
  const batchResults = await Promise.all(batch.map(p => this.safeReadFile(p)));
  results.push(...batchResults);
}
```

**陷阱**: 全部并发导致 EMFILE（文件描述符耗尽）

---

### ADR-09: Outline 缓存 LRU

**决策**: 容量 100，TTL 5 分钟

```typescript
// registry.ts
if (this.cache.size >= MAX_CACHE_SIZE && !this.cache.has(key)) {
  const oldestKey = cacheAccessOrder.shift();
  cache.delete(oldestKey);
}
```

**缓存键**: `${uri}:${version}:${optionsStr}`

**陷阱**: Document 版本变化必须失效缓存

---

### ADR-10: IgnoreFilter reload 引用陷阱

**决策**: 使用 `length = 0; push(...)` 清空数组

```typescript
// ignoreFilter.ts
if (binaryPatterns) {
  this.binaryPatterns.length = 0;
  this.binaryPatterns.push(...binaryPatterns);
}
```

**陷阱**: 直接赋值会导致多个实例共享引用

---

## 边界陷阱

| 场景 | 防御 |
|------|------|
| LSP 不可用 | 三级降级至 Regex |
| 文件读取失败 | `safeReadFile()` 捕获返回占位符 |
| 无工作区 | `workspaceFolders?.[0]` 空值检查 |
| 模板变量缺失 | `value || ''` 空字符串替换 |
| 目录访问失败 | try-catch 跳过，`skipped++` |

---

## 资源管理

### OutlineExtractorRegistry.clearCache()

**调用时机**: 配置变更、大量文件处理完成

**防止**: 内存泄漏（100 条 × 大文件 outline）

---

### ContextGenerator.dispose()

**调用时机**: 命令执行完成

**清理**: Logger 日志，无长连接需释放

---

## 并发安全

### FileReader 批次控制

**问题**: `Promise.all()` 可能导致 EMFILE

**解决**: 分批处理（默认 50）

---

### IgnoreFilter 状态

**问题**: `reload()` 修改运行时状态

**现状**: 单线程无竞态，无需锁
