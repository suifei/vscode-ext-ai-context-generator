# TypeScript/JavaScript 语义大纲 — 产品规格（LLM 导向）

**版本**: 1.3  
**范围**: 大文件触发的 `TypeScriptSemanticExtractor` 输出；与 `outlineDetail`（basic / standard / detailed）对齐。  
**非目标**: 完整控制流图、三地址码、数据流分析（可作为后续增强）。

---

## 1. 设计目标

在 **显著低于全文** 的 token 下，为模型提供可推理的 **锚点 + 依赖 + 控制骨架 + 主路径顺序**，避免：

- 用大量「Expression statement」假装描述算法；
- 与 `dep` 同义的内容在 `flow` / `path` 中逐条复读；
- 用逐行 `//` 注释风格或整段源码级 `getText` 撑爆 `dep:`。

**原则**（与 LLM 使用方式一致）：


| 原则        | 说明                                                      |
| --------- | ------------------------------------------------------- |
| 不遗漏关键     | 保留签名、用户类型名、关键调用名、分支/循环的**依据样本**、副作用入口                   |
| 不分散注意力    | 短标签行（`fn` / `io` / `dep` / `ctl`）；信息分层：先契约与依赖，再控制与 Flow |
| 不浪费 token | 列表截断、callee **规范化**为单行符号、`path` 仅在 Flow 信息不足时补充         |
| 有价值       | 每节应对「这是谁、靠什么、在什么条件下分叉、主路径怎么走」之一有答案                      |


---

## 2. 输出格式：compact DSL（v1.3）

**不使用**逐行 `//` 前缀。嵌入 Markdown 时推荐围栏：**````plaintext`**（内容不是合法 TypeScript；标成` typescript` 易造成误导高亮）。

文件级标题（仅一段）：

- `── semantic · N fns · v1.3 ──`

每个函数块字段顺序固定如下。

### 2.1 锚点层（所有档位）

- `**fn`** — 一行锚点签名（async/static/export/constructor + 参数名；类成员直接写限定名如 `ContextGenerator.generate`；不写 `function` 关键字，不重复参数类型，过长截断）。
- `**doc:`** — JSDoc 摘要（`outlineExtractComments` 为 true 时；standard 默认更长上限约 **120** 字符，detailed 可到 **200**）。
- `**io:`** — `参数列表 -> 返回类型`；无参写 `∅`；推断返回写 `infer` / `expr` 等短标记。

### 2.2 依赖层（standard+）

- `**dep:`** — 非琐碎调用与 `new`，**字典序**，默认最多 **28** 项。  
  - 每项为**单行**规范化符号（如 `DirTreeGenerator.generate`、`vscode.window.showWarningMessage.then`），**禁止**嵌入多行源码或完整实参列表。
  - 平台/日志 API 可聚合：如 `Logger.*`、`vscode.window.*`、`vscode.workspace.fs.*`，避免低价值 API 枚举占满注意力。

### 2.3 控制骨架层（standard+，函数体为 `{ ... }`）

合并原 `Control` / `Branch basis` / `Loop basis` 为一行：

- `**ctl: Xbr Ylp`** — 分支点数、循环点数（if/switch/try、各类循环，嵌套各算一次）。
- 若有样本谓词，追加  `**|`** 连接至多 **4** 条 branch 样本 + 至多 **4** 条 loop 样本（过长截断）：  
`ctl: 2br 0lp | if (a) | switch (x) | for-of xs | while (ok)`

当 **X=Y=0** 且无样本行时，**省略整行 `ctl:`**（避免 `0br 0lp` 噪声）。

### 2.4 叙述与主路径（standard+）

- `**flow:**` — 单步 Flow 可写成 `flow: -> callee`；多步 Flow 下一行起列步骤（**无** `//`、**无**编号前缀）。构造器仍为 `**cfg:`** / `**wire:`** 两行叙事（不走 O3）。
- `**path:`** — 按语句顺序的完整主调用链（`→` 连接，不截断）。  
  - **仅当** Flow 中「有意义」步骤 **少于 2** 且能收集到 ≥2 个 pipeline 标签时输出，用于补足弱 Flow；**不与**强 Flow 重复堆砌。
- **O3（P4）** 仍在 `collapseRedundantFlow` 与 `balanceFlowSteps` 之间执行；**构造器**与部分仅需 `seq` 补步的路径不走 O3。

#### Flow 行内符号


| 符号                                                      | 含义                                 |
| ------------------------------------------------------- | ---------------------------------- |
| `-> name`                                               | 调用                                 |
| `<- return`                                             | 返回                                 |
| `<- return · if(cond)`                                  | 早退合并                               |
| `:= lhs ← rhs`                                          | 赋值                                 |
| `# decl`                                                | 变量声明                               |
| `if (cond)` / `switch(c1,c2,def)` / `@ for-of …` / `try {…}` 等 | 控制结构（`switch` 列出真实 case/default 标签） |
| `log: debug×N, warn`                                    | Logger 调用段聚合                       |
| `~ misc` / `… seq(n)`                                   | 低信息占位（wrapper 可被压缩为单行 `-> callee`） |
| `ctrl: …`                                               | 多分支且 Flow 仍长时 O3 注入的首行压缩           |
| `cfg:` / `wire:` / `new (n):` / `setup (n):` / `init`   | 构造器专用                              |


#### 优化阶段 P0–P4（简述）


| 阶段       | 内容                                                   |
| -------- | ---------------------------------------------------- |
| P0–P3    | 条件截断、合并 if+return、Branch 与 Flow 去重、debug 链压缩、`ctrl:` |
| P4 (-O3) | pass1 合并 → pass2 去冗余 `if` → pass3 压缩链（含 `ctrl:`）     |


### 2.5 detailed 附加

- `**fx:`** — 推断的 UI/IO/Logger 等副作用；若同一调用已在 `flow` 中出现，则不再重复输出。
- `**throw:`** — `throw` 表达式摘要。

---

## 3. `outlineDetail` 映射


| 档位       | dep | ctl / flow / path | fx / throw |
| -------- | --- | ----------------- | ---------- |
| basic    | 否   | 否                 | 否          |
| standard | 是   | 是                 | 否          |
| detailed | 是   | 是                 | 是          |


---

## 4. Token 与上限策略

- `**dep:`** 单行长度受 callee 规范化与截断约束；字典序 + 上限 28。
- `**path:**` 不截断；Flow 不再生成 `…(+N)` 省略标记。
- `**fn` 签名** 单行上限约 **130** 字符。
- **Doc 边界截断**：`doc` 优先在词边界截断，避免 `Compi…` 这类半截词噪声。
- **复杂类型折叠**：对象字面量参数折叠为 `{k:T,k?:U}`，函数类型折叠为 `fn`，union/intersection 去掉多余空格，避免 `fn` / `io` 多行展开。
- **锚点/契约去重**：`fn` 只保留参数名，`io` 保留类型契约；单调用 wrapper 可将 `io` 简化为参数名 + 返回类型。
- **类成员定位**：类限定名并入 `fn`，省略独立 `sym:` 行。
- **Wrapper 压缩**：若函数体仅代理到一个调用且无控制结构，合并为 `fn x(...) -> T = callee`（`void` / `Promise<void>` 省略返回类型），并省略重复短 `doc` / `io` / `dep` / `flow`。
- **单调用去重**：single-call wrapper 的 `flow: -> callee` 与 `dep: callee` 完全重复时，保留 `flow`，省略 `dep`。
- **依赖/输出去重**：若依赖已被 `flow` / `path` / `fn = callee` 明确表达，则可从 `dep` 中省略，避免重复列协作对象。
- **控制去重**：若所有 `ctl` 分支条件已在 early-return Flow 中完整出现，则省略 `ctl`。
- **重复调用压缩**：连续相同 Flow 调用合并为 `-> name×N`，不截断但压缩重复噪声。
- **日志段聚合**：连续 Logger 调用合并为 `log: debug×N, warn, info`，并从 `dep` / `fx` 中去除已覆盖的 Logger 噪声。
- **Fallback 链模式化**：`result ← extractor.extract` + `setInCache` + `return` 链输出为 `try extractor -> cache -> return`。
- **Guard 流结构化**：简单 guard-return 流可输出为 `if (...) -> action -> return`，保留条件与结果，省略调试日志。
- **弱 Flow 删除**：`# decl`、`~ misc`、`stmt:BreakStatement`、`… seq(n)` 默认不输出；若整段只有弱步骤，则保留最小可读提示。
- **长 Flow 主路径化**：当 Flow 信息偏弱时，用完整 `path:` 承载主调用链；`flow:` 保留早退、try/switch/loop、throw、`ctrl:` 等关键控制/副作用骨架。
- 函数个数由 `**outlineMaxItems`** 约束。

---

## 5. 与本仓库实现对齐

- 实现文件：`src/outline/typescriptSemanticExtractor.ts`
- 注册与校验：`src/outline/registry.ts` — `isValidOutline` 接受 **legacy** `// FUNCTIONS` 头或 **v1.3** `── semantic` / `fn`  紧凑大纲。

---

## 6. 评估与迭代

- 固定样本与自动生成报告：`npm run semantic:eval` → `docs/samples/SEMANTIC-EVAL-REPORT.md`（含字符 / 粗估 tokens / dep 最长行 / path 与 flow 块计数）。
- 迭代时同步更新本节或报告中的 **已知局限**。

**当前已知局限（v1.3）**

- 表达式体函数（无块）：无 `**ctl:`**，仅有 `**dep`** + 单行 Flow 提示。
- `switch` 的 Flow 仅写判别式，不枚举各 `case` 标签。
- 有序 `**path:**` 为 **调用顺序近似**，非严格求值顺序。
- O3 pass2 在存在 branch 样本时会删掉 Flow 内裸 `if (` 行：请结合 `**ctl:`** 与 `**dep:`**。