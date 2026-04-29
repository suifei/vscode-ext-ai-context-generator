/**
 * Unit tests for TypeScriptSemanticExtractor (compact DSL v1.3)
 */

import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { TypeScriptSemanticExtractor } from '../../../src/outline/typescriptSemanticExtractor';

function mockDoc(fsPath: string, languageId: string, text: string): vscode.TextDocument {
  return {
    uri: vscode.Uri.file(fsPath),
    languageId,
    getText: () => text,
  } as unknown as vscode.TextDocument;
}

describe('TypeScriptSemanticExtractor', () => {
  const extractor = new TypeScriptSemanticExtractor();

  it('basic detail omits Flow and dep', async () => {
    const code = `
      export function foo(a: number): number {
        if (a > 0) return bar(a);
        return 0;
      }
      function bar(x: number) { return x * 2; }
    `;
    const doc = mockDoc('/tmp/basic.ts', 'typescript', code);
    const out = await extractor.extract(doc, { detail: 'basic', maxItems: 10 });
    expect(out).to.include('io:');
    expect(out).to.include('fn ');
    expect(out).to.not.include('\nflow:\n');
    expect(out).to.not.include('dep:');
  });

  it('standard detail includes flow/path and call evidence', async () => {
    const code = `
      async function run(x: string): Promise<void> {
        await fetch(x);
        console.log('ok');
      }
    `;
    const doc = mockDoc('/tmp/std.ts', 'typescript', code);
    const out = await extractor.extract(doc, { detail: 'standard', maxItems: 10 });
    expect(out).to.include('v1.3');
    expect(out).to.include('semantic');
    expect(out).to.match(/(?:flow|path):/);
    expect(out).to.match(/fetch|console\.log/);
  });

  it('detailed records ctl and branch hints for if inside try', async () => {
    const code = `
      function risky(): void {
        try {
          if (Math.random() > 0.5) throw new Error('x');
        } catch (e) {
          console.error(e);
        }
      }
    `;
    const doc = mockDoc('/tmp/det.ts', 'typescript', code);
    const out = await extractor.extract(doc, { detail: 'detailed', maxItems: 10 });
    expect(out).to.include('ctl:');
    expect(out).to.match(/if \(Math\.random\(\)/);
    expect(out).to.match(/try\/catch/);
  });

  it('includes class-qualified method anchor and filters private by default', async () => {
    const code = `
      class C {
        public ok(): void { return; }
        private hidden(): void { return; }
      }
    `;
    const doc = mockDoc('/tmp/cls.ts', 'typescript', code);
    const out = await extractor.extract(doc, { detail: 'basic', maxItems: 10 });
    expect(out).to.include('fn C.ok()');
    expect(out).to.not.include('hidden');
  });

  it('includePrivate exposes private methods', async () => {
    const code = `
      class D {
        private secret(): number { return 1; }
      }
    `;
    const doc = mockDoc('/tmp/priv.ts', 'typescript', code);
    const out = await extractor.extract(doc, { detail: 'basic', includePrivate: true, maxItems: 10 });
    expect(out).to.include('secret');
  });

  it('collects top-level const arrow functions', async () => {
    const code = `const fn = (n: number) => n + 1;\n`;
    const doc = mockDoc('/tmp/arrow.ts', 'typescript', code);
    const out = await extractor.extract(doc, { detail: 'standard', maxItems: 5 });
    expect(out).to.include('fn(');
  });

  it('O3 merges if+return and omits ctl when early-return flow covers it', async () => {
    const code = `
      function f(x: number): number {
        if (x < 0) return -1;
        if (x > 100) return 100;
        return x;
      }
    `;
    const doc = mockDoc('/tmp/o3.ts', 'typescript', code);
    const out = await extractor.extract(doc, { detail: 'standard', maxItems: 5 });
    expect(out).to.not.include('ctl:');
    expect(out).to.include('<- return ·');
    expect(out).to.not.include('? if/else');
  });

  it('constructor Flow summarizes helpers and collaborators instead of generic steps', async () => {
    const code = `
      function setup(): number { return 1; }
      class X {
        constructor(w: string) {
          this.w = w;
          this.a = setup();
          this.b = new Foo();
          this.c = new Bar();
        }
      }
    `;
    const doc = mockDoc('/tmp/ctor.ts', 'typescript', code);
    const out = await extractor.extract(doc, { detail: 'standard', maxItems: 10 });
    expect(out).to.include('cfg:');
    expect(out).to.include('wire:');
    expect(out).to.include('Foo');
    expect(out).to.include('Bar');
  });

  it('summarizes switch with concrete case labels', async () => {
    const code = `
      function route(target: 'clipboard' | 'file' | 'preview' | 'other'): void {
        switch (target) {
          case 'clipboard':
            copy();
            break;
          case 'file':
            save();
            break;
          case 'preview':
            show();
            break;
          default:
            noop();
        }
      }
    `;
    const doc = mockDoc('/tmp/switch.ts', 'typescript', code);
    const out = await extractor.extract(doc, { detail: 'standard', maxItems: 5 });
    expect(out).to.include("switch('clipboard'->copy,'file'->save,'preview'->show,def->noop)");
    expect(out).to.not.include('switch (target)');
  });

  it('depends-on entries are single-line compact symbols (no multi-line callee)', async () => {
    const code = `
      function x(flag: boolean): void {
        if (flag) {
          vscode.window.showWarningMessage(\`hello
            world\`).then(() => {});
        }
      }
    `;
    const doc = mockDoc('/tmp/dep.ts', 'typescript', code);
    const out = await extractor.extract(doc, { detail: 'standard', maxItems: 5 });
    const depLine = out.split('\n').find(l => l.startsWith('dep:'));
    const flowLine = out.split('\n').find(l => l.includes('vscode.window.showWarningMessage'));
    expect(depLine ?? flowLine).to.exist;
    expect(depLine ?? flowLine).to.match(/vscode\.window\.showWarningMessage/);
  });

  it('omits io for void single-call wrappers', async () => {
    const code = `
      async function target(a: string): Promise<void> {}
      export async function wrap(a: string): Promise<void> {
        return target(a);
      }
    `;
    const doc = mockDoc('/tmp/wrap.ts', 'typescript', code);
    const out = await extractor.extract(doc, { detail: 'standard', maxItems: 10 });
    const wrapBlock = out.split('\n\n').find(block => block.includes('wrap(a)'));
    expect(wrapBlock).to.include('= target');
    expect(wrapBlock).to.not.include('dep: target');
    expect(wrapBlock).to.not.include('\nio:');
    expect(wrapBlock).to.include('fn export async wrap(a)');
  });

  it('omits fx entries already represented in flow', async () => {
    const code = `
      function d(): void {
        Logger.debug('x');
      }
    `;
    const doc = mockDoc('/tmp/fx.ts', 'typescript', code);
    const out = await extractor.extract(doc, { detail: 'detailed', maxItems: 5 });
    expect(out).to.include('log: debug');
    expect(out).to.not.include('fx: Logger.debug');
  });

  it('compresses repeated flow calls and fallback extractor chains', async () => {
    const code = `
      async function chain(): Promise<string> {
        if (cached) return cached;
        Logger.debug('semantic');
        result = await this.semanticExtractor.extract();
        this.setInCache();
        return result;
        Logger.debug('lsp');
        result = await this.lspExtractor.extract();
        this.setInCache();
        return result;
      }
    `;
    const doc = mockDoc('/tmp/chain.ts', 'typescript', code);
    const out = await extractor.extract(doc, { detail: 'standard', maxItems: 5 });
    expect(out).to.include('cache? -> return');
    expect(out).to.include('try semanticExtractor -> cache -> return');
    expect(out).to.include('try lspExtractor -> cache -> return');
  });

  it('sample: contextGenerator.ts yields semantic outline with core APIs', async () => {
    const filePath = path.join(process.cwd(), 'src/core/contextGenerator.ts');
    if (!fs.existsSync(filePath)) {
      return;
    }
    const text = fs.readFileSync(filePath, 'utf8');
    const doc = mockDoc(filePath, 'typescript', text);
    const out = await extractor.extract(doc, { detail: 'standard', maxItems: 30 });
    expect(out.length).to.be.greaterThan(200);
    expect(out).to.include('v1.3');
    expect(out).to.match(/generate|processFiles|extractOutline|sanitizeConfig/i);
    expect(out).to.include('flow:');
    expect(out).to.match(/\ndep: /);
  });
});
