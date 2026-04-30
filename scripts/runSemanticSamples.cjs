/**
 * Run TypeScriptSemanticExtractor on real project files (CLI sample output).
 * Usage: npm run semantic:samples
 */

const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'vscode') {
    return {
      Uri: {
        file: (fsPath) => ({
          fsPath,
          path: fsPath,
          scheme: 'file',
          toString: () => `file://${fsPath}`,
        }),
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
  console.error('Missing compiled output. Run: npx tsc -p tsconfig.json');
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
  ['dist/extension.js', 'javascript', 'standard', 999],
  ['src/core/contextGenerator.ts', 'typescript', 'standard', 999],
  ['src/commands/generateCommand.ts', 'typescript', 'standard', 999],
  ['src/outline/registry.ts', 'typescript', 'standard', 999],
  ['src/core/ignoreFilter.ts', 'typescript', 'standard', 999],
];

function estimateTokens(chars) {
  return Math.ceil(chars / 3.5);
}

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function formatMetrics(sourceChars, out) {
  const outChars = out.length;
  const ratio = sourceChars > 0 ? ((outChars / sourceChars) * 100).toFixed(1) : '0.0';
  const lines = out ? out.split('\n').length : 0;
  const fns = countMatches(out, /^fn /gm);
  const flows = countMatches(out, /^flow:/gm);
  const paths = countMatches(out, /^path:/gm);
  return `source=${sourceChars} chars, outline=${outChars} chars, ~${estimateTokens(outChars)} tokens, ratio=${ratio}%, lines=${lines}, fn=${fns}, flow=${flows}, path=${paths}`;
}

async function main() {
  const extractor = new TypeScriptSemanticExtractor();

  console.log('# 函数级语义提取 — 项目真实样本（standard，节选函数条数见各段标题）\n');

  for (const [rel, lang, detail, maxItems] of SAMPLES) {
    const full = path.join(root, rel);
    const text = fs.readFileSync(full, 'utf8');
    const out = await extractor.extract(mockDoc(full, lang, text), {
      detail,
      maxItems,
      extractComments: true,
      includePrivate: false,
    });

    console.log('\n---');
    console.log(`## ${rel}`);
    console.log(`(detail=${detail}, maxItems=${maxItems}, ${formatMetrics(text.length, out)})`);
    console.log('---\n');
    console.log(out || '(empty — 解析未产出大纲)');
    console.log('');
  }

  // 额外：同一份 contextGenerator 用 detailed 多看 Side effects / Branches（条数略减）
  const cg = path.join(root, 'src/core/contextGenerator.ts');
  const cgText = fs.readFileSync(cg, 'utf8');
  const detailed = await extractor.extract(mockDoc(cg, 'typescript', cgText), {
    detail: 'detailed',
    maxItems: 12,
    extractComments: true,
  });
  console.log('\n---');
  console.log('## src/core/contextGenerator.ts（detailed，maxItems=12，便于看 Branches / Side effects）');
  console.log(`(${formatMetrics(cgText.length, detailed)})`);
  console.log('---\n');
  console.log(detailed || '(empty)');
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
