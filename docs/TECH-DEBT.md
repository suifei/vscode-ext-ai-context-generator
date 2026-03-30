# TECH-DEBT.md - 技术债清单

## 废弃资产（保留但已弃用）

| 位置 | 状态 | 原因 |
|------|------|------|
| `tokenCounter.ts:countMultiple()` | 弃用 | 仅测试依赖 |
| `tokenCounter.ts:countFile()` | 弃用 | 仅测试依赖 |
| `tokenCounter.ts:exceedsLimit()` | 弃用 | 仅测试依赖 |
| `tokenCounter.ts:getUsagePercentage()` | 弃用 | 仅测试依赖 |
| `tokenCounter.ts:createTokenCounter()` | 弃用 | 仅测试依赖 |

## 已清理资产（v1.2+）

| 位置 | 清理原因 |
|------|----------|
| `src/ui/outputPicker.ts` | 功能内联至 `generateCommand.ts`，UI picker 简化 |
| `web-tree-sitter` npm 包 | LSP 降级策略已足够 |
| `getSupportedLanguages()` | 未使用 |
| `formatLineInfo()` | 逻辑合并 |
| `getLanguageFromExtension()` | 冗余方法 |

## 设计局限与已知问题

### 1. Outline 三级降级串行执行

**位置**: `outline/registry.ts:78-100`

**问题**: AST → Basic → Regex 降级时，每次失败后重新解析，无缓存

**影响**: 性能损耗

**优先级**: 低（LRU 缓存已缓解）

---

### 2. Analyzer 构造函数重复

**位置**: `src/summary/*.ts`（5 个文件）

**问题**: 每个 Analyzer 都有相同构造函数模式 `(config, workspaceRoot)`

**影响**: 维护成本

**优先级**: 低（引入基类违背 KISS）

---

### 3. IgnoreFilter binaryPatterns 引用陷阱

**位置**: `ignoreFilter.ts:42-45`

**问题**: `reload()` 方法必须使用 `length = 0; push(...)` 避免引用共享

**影响**: 若直接赋值会导致多个实例共享同一数组

**优先级**: 低（已正确处理）

---

### 4. 二进制检测的内容扫描

**位置**: `fileReader.ts:156-168`

**问题**: 无扩展名文件读取前 1KB 检测 null 字节

**影响**: 小额外 I/O，但误报率低

**优先级**: 低

---

## 未实现配置项

| 配置项 | 默认值 | 状态 |
|--------|--------|------|
| `outlineDetail` | 'standard' | 已实现 |
| `outlineIncludePrivate` | false | 已实现 |
| `outlineExtractComments` | true | 已实现 |
| `outlineMaxItems` | 50 | 已实现 |

> 上述配置项在 v1.2+ 已全部实现并集成至 `ContextGenerator`

## 优化机会（非债务）

| 机会 | 收益 | 工作量 |
|------|------|--------|
| LSP Symbol 缓存复用 | 减少 LSP 调用 | 4h |
| 文件读取流式化 | 降低内存峰值 | 8h |
| 并发限制动态调整 | 适应不同硬件 | 2h |

## 债务优先级矩阵

```
高影响/高频率 (优先处理)
├─ 无

高影响/低频率
├─ 无

低影响/高频率
├─ Outline 降级缓存

低影响/低频率
├─ Analyzer 构造函数统一
```
