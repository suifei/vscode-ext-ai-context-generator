/**
 * Generate docs/samples/SEMANTIC-EVAL-REPORT.md from real project sources (semantic extractor).
 * Usage: npm run semantic:eval
 */

const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'vscode') {
    return {
      Uri: {
        file: (fsPath) => ({ fsPath, path: fsPath, scheme: 'file' }),
      },
      window: {
        createOutputChannel: () => ({
          appendLine: () => {},
          append: () => {},
          show: () => {},
          dispose: () => {},
        }),
      },
    };
  }
  return origRequire.apply(this, arguments);
};

const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const extractorPath = path.join(root, 'out', 'src', 'outline', 'typescriptSemanticExtractor.js');
if (!fs.existsSync(extractorPath)) {
  console.error('Run: npx tsc -p tsconfig.json');
  process.exit(1);
}

// eslint-disable-next-line import/no-dynamic-require, @typescript-eslint/no-require-imports
const { TypeScriptSemanticExtractor } = require(extractorPath);

function mockDoc(fsPath, languageId, text) {
  return {
    uri: { fsPath },
    languageId,
    getText: () => text,
  };
}

const SAMPLES = [
  ['src/core/contextGenerator.ts', { detail: 'standard', maxItems: 35 }],
  ['src/outline/registry.ts', { detail: 'standard', maxItems: 15 }],
  ['src/commands/generateCommand.ts', { detail: 'standard', maxItems: 22 }],
];

/** Rough token estimate (char/3.5) for LLM context budgeting */
function estTokens(chars) {
  return Math.ceil(chars / 3.5);
}

function metricsFor(out) {
  if (!out) {
    return {
      lineCount: 0,
      fnCount: 0,
      maxDepLen: 0,
      hasPath: false,
      pathCount: 0,
      flowHeaderCount: 0,
      loggerFlowCount: 0,
      depOutputOverlapCount: 0,
      bareCtlCount: 0,
    };
  }
  const lines = out.split('\n');
  const fnCount = (out.match(/^fn /gm) || []).length;
  const depLines = lines.filter((l) => l.startsWith('dep:'));
  const maxDepLen = depLines.length ? Math.max(...depLines.map((l) => l.length)) : 0;
  const pathLines = lines.filter((l) => l.startsWith('path:'));
  const flowText = lines
    .filter((l) => l.trim().startsWith('->') || l.trim().startsWith('flow:') || l.trim().startsWith('path:'))
    .join('\n');
  const depItems = depLines.flatMap((line) => line.replace(/^dep:\s*/, '').split(/,\s*/));
  return {
    lineCount: lines.length,
    fnCount,
    maxDepLen,
    hasPath: pathLines.length > 0,
    pathCount: pathLines.length,
    flowHeaderCount: (out.match(/^flow:/gm) || []).length,
    loggerFlowCount: (out.match(/(?:-> Logger\.|log:)/g) || []).length,
    depOutputOverlapCount: depItems.filter((dep) => dep && flowText.includes(dep)).length,
    bareCtlCount: lines.filter((l) => /^ctl:\s+\d+br\s+\d+lp\s*$/.test(l)).length,
  };
}

async function main() {
  const extractor = new TypeScriptSemanticExtractor();
  const sections = [];
  let gitSha = '';
  try {
    gitSha = require('child_process').execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
  } catch {
    gitSha = 'unknown';
  }

  sections.push(`# 语义大纲抽样评估报告`);
  sections.push('');
  sections.push(`- 生成时间: ${new Date().toISOString()}`);
  sections.push(`- Git: ${gitSha}`);
  sections.push(`- 规格: [docs/SEMANTIC-OUTLINE-SPEC.md](../SEMANTIC-OUTLINE-SPEC.md)`);
  sections.push(`- 格式: **semantic DSL v1.3**（无逐行 \`//\`；\`io\` / \`dep\` / \`ctl\` / \`flow\` / \`path\`）`);
  sections.push(`- 选项: standard + extractComments；样本见下表`);
  sections.push('');

  const rows = [];
  let totalChars = 0;
  let totalEst = 0;

  for (const [rel, opts] of SAMPLES) {
    const full = path.join(root, rel);
    const text = fs.readFileSync(full, 'utf8');
    const out = await extractor.extract(mockDoc(full, 'typescript', text), {
      extractComments: true,
      includePrivate: false,
      ...opts,
    });
    const len = out.length;
    totalChars += len;
    const et = estTokens(len);
    totalEst += et;
    const m = metricsFor(out);
    rows.push({ rel, len, et, ...m, out });
  }

  sections.push(`## 样本指标速览`);
  sections.push('');
  sections.push(
    '| 文件 | 字符 | ~tokens† | 行数 | fn | dep最长行 | path行 | flow块 | logFlow | dep输出重叠 | 空ctl |'
  );
  sections.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const r of rows) {
    sections.push(
      `| \`${r.rel}\` | ${r.len} | ${r.et} | ${r.lineCount} | ${r.fnCount} | ${r.maxDepLen} | ${r.pathCount} | ${r.flowHeaderCount} | ${r.loggerFlowCount} | ${r.depOutputOverlapCount} | ${r.bareCtlCount} |`
    );
  }
  sections.push('');
  sections.push(`† ~tokens = ⌈字符数 / 3.5⌉（粗估，便于与 tiktoken 对照）。`);
  sections.push('');

  sections.push(`## 原始提取输出`);
  sections.push('');

  for (const r of rows) {
    sections.push(`### ${r.rel}`);
    sections.push('');
    sections.push('```plaintext');
    sections.push(r.out || '(empty)');
    sections.push('```');
    sections.push('');
    sections.push(`_本段: ${r.len} 字符, ~${r.et} tokens_`);
    sections.push('');
  }

  sections.push(`## 体量汇总`);
  sections.push('');
  sections.push(
    `- 上述片段合计 **${totalChars}** 字符，粗估 **~${totalEst}** tokens（未含 Markdown 外壳）。`
  );
  sections.push('');

  sections.push(`## Agent 评估维度（用于迭代）`);
  sections.push('');
  sections.push(`| 维度 | 说明 |`);
  sections.push(`|------|------|`);
  sections.push(`| 锚点 | \`fn\` / \`sym\` / \`io\` 是否足以定位职责 |`);
  sections.push(`| 依赖完整性 | \`dep:\` 是否覆盖主要协作对象（单行、无源码碎片） |`);
  sections.push(`| 控制可读性 | \`ctl:\` 是否回答分叉/循环；弱 Flow 时 \`path:\` 是否补主路径 |`);
  sections.push(`| 冗余度 | \`flow\` 与 \`path\` 是否重复堆砌 |`);
  sections.push(`| Token 效率 | 相对全文是否显著压缩且信息密度高 |`);
  sections.push('');

  sections.push(`### 本轮结论占位`);
  sections.push('');
  sections.push(`> 由维护者在评审提取结果后填写；或通过 CI 将本节替换为摘要。`);
  sections.push('');

  const outDir = path.join(root, 'docs', 'samples');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'SEMANTIC-EVAL-REPORT.md');
  fs.writeFileSync(outFile, sections.join('\n'), 'utf8');
  console.log(`Wrote ${path.relative(root, outFile)} (${totalChars} chars body)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
