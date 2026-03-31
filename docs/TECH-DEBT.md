# TECH-DEBT.md - 技术债清单

## 已清理资产

| 版本 | 清理项 | 原因 |
|------|--------|------|
| v1.3 | `filesToList()` 函数 | 仅一处使用，已内联 |
| v1.3 | `readGitignore()` 重复 | 提取至 `utils/gitUtils.ts` |
| v1.3 | 错误处理模式重复 | 提取至 `utils/errorUtils.ts` |
| v1.2 | `src/ui/outputPicker.ts` | 功能内联至 `generateCommand.ts` |
| v1.1 | WebView 侧边栏 | 简化 UX，移除 |
| v1.1 | `defaultOutputTarget` 配置 | 菜单直接输出，无需配置 |

## 当前设计局限

### 1. SmartSummarizer 延迟实例化机会

**位置**: `core/smartSummarizer.ts:34-39`

**现状**: 构造时创建 5 个 Analyzer 实例，但每次只使用 1 个

**影响**: 轻微内存浪费（每个 Analyzer 仅存储 config + workspaceRoot 引用）

**优先级**: 极低（实例轻量，延迟实例化增加复杂度）

---

### 2. Outline 三级降级串行执行

**位置**: `outline/registry.ts:extractOutline()`

**现状**: AST → Basic → Regex 每次失败后重新解析

**缓解**: LRU 缓存（TTL 5min，容量 100）

**优先级**: 低

---

### 3. 模板变量替换无验证

**位置**: `core/templateRenderer.ts:render()`

**现状**: 未定义变量替换为空字符串，无警告

**影响**: 用户可能误用变量名

**优先级**: 低（保持静默失败符合 KISS）

---

## 无债务项

以下项经评估**不属于**技术债：

| 项 | 评估理由 |
|----|----------|
| Analyzer 构造函数重复 | 引入基类违背 KISS，当前模式清晰 |
| `binaryPatterns` 引用陷阱 | 已在代码中正确处理 |
| 二进制内容扫描（1KB） | 误报率低，额外 I/O 可接受 |
| maxDepth=100 魔法数字 | 实际项目极少超过，提取常量收益低 |
| 3.75 token 估算系数 | 通用近似值，无需配置化 |

## 优化机会（非债务）

| 机会 | 收益 | 成本 | 优先级 |
|------|------|------|--------|
| CancellationToken 支持 | 大项目可中断 | 中 | 中 |
| 二进制元数据流式读取 | 降低内存峰值 | 高 | 低 |
| 并发限制动态调整 | 适应硬件 | 低 | 低 |
| Outline 缓存预热 | 减少首开延迟 | 中 | 低 |

## 债务优先级矩阵

```
高影响/高频率
└─ 无

高影响/低频率
└─ 无

低影响/高频率
└─ Outline 三级降级（已缓存缓解）

低影响/低频率
└─ SmartSummarizer 延迟实例化
```
