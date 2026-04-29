/**
 * TypeScript/JavaScript function-level semantic summary using the TypeScript Compiler API.
 * Produces compact DSL v1.3: fn/io/dep/ctl/flow/path (and optional fx/throw in detailed) for LLM context.
 */

import * as ts from 'typescript';
import * as vscode from 'vscode';
import { truncateText } from './formatConstants';
import type { OutlineOptions } from './registry';
import { OutlineExtractor } from './outlineExtractor';

const TRIVIAL_GLOBALS = new Set([
  'Object',
  'Array',
  'String',
  'Number',
  'Boolean',
  'Math',
  'JSON',
  'Date',
  'RegExp',
  'Error',
  'Promise',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'Symbol',
  'BigInt',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'encodeURI',
  'decodeURI',
  'encodeURIComponent',
  'decodeURIComponent',
]);

const MIN_FLOW_STEPS = 3;
/** Compact outline DSL revision */
const SEMANTIC_FMT = 'v1.3';
const SIG_LINE_MAX = 130;
const DOC_MAX_STANDARD = 120;
const IO_LINE_MAX = 180;

/**
 * Compact Flow-step glyphs (LLMs treat -> / <- as verbs widely used in docs).
 */
const FLOW = {
  invoke: (callee: string) => `-> ${callee}`,
  invokeUnknown: '-> …',
  ret: '<- return',
  decl: '# decl',
  tryOpen: 'try {…}',
  throwKW: '!! throw',
  misc: '~ misc',
  exprBody: '= expr',
  seq: (n: number) => `… seq(${n})`,
  miscRun: (run: number) => `~misc×${run} (path/dep)`,
  stmtKind: (kind: string) => `stmt:${kind}`,
} as const;

/** Meta for O3-style triple refinement of Flow lines */
interface FlowRefineMeta {
  branchHints: string[];
  loopHints: string[];
  dependsCount: number;
  statementCount: number;
}

interface CollectedFunction {
  node: ts.FunctionLikeDeclaration;
  /** e.g. ClassName.method or file-level name */
  qualifiedName: string;
  isMethod: boolean;
}

export class TypeScriptSemanticExtractor {
  async extract(document: vscode.TextDocument, options?: OutlineOptions): Promise<string> {
    const merged = { ...OutlineExtractor.DEFAULT_OPTIONS, ...options };

    const lang = document.languageId.toLowerCase();
    if (!['typescript', 'typescriptreact', 'javascript', 'javascriptreact'].includes(lang)) {
      return '';
    }

    let scriptKind: ts.ScriptKind;
    if (lang === 'typescriptreact') {
      scriptKind = ts.ScriptKind.TSX;
    } else if (lang === 'javascriptreact') {
      scriptKind = ts.ScriptKind.JSX;
    } else if (lang === 'javascript' || lang === 'javascriptreact') {
      scriptKind = ts.ScriptKind.JS;
    } else {
      scriptKind = ts.ScriptKind.TS;
    }

    const fileName = document.uri.fsPath || 'snippet.ts';
    const text = document.getText();

    let sourceFile: ts.SourceFile;
    try {
      sourceFile = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, scriptKind);
    } catch {
      return '';
    }

    const collected: CollectedFunction[] = [];
    const visit = (node: ts.Node, className?: string) => {
      if (ts.isClassDeclaration(node) && node.name) {
        const name = node.name.text;
        ts.forEachChild(node, child => visit(child, name));
        return;
      }

      if (ts.isClassDeclaration(node) && !node.name) {
        ts.forEachChild(node, child => visit(child, className));
        return;
      }

      if (ts.isFunctionDeclaration(node) && node.name) {
        collected.push({
          node,
          qualifiedName: node.name.text,
          isMethod: false,
        });
      } else if (ts.isMethodDeclaration(node) && node.name) {
        const methodName = node.name.getText(sourceFile);
        const q = className ? `${className}.${methodName}` : methodName;
        collected.push({ node, qualifiedName: q, isMethod: true });
      } else if (ts.isConstructorDeclaration(node) && className) {
        collected.push({
          node,
          qualifiedName: `${className}.constructor`,
          isMethod: true,
        });
      } else if (ts.isSourceFile(node)) {
        ts.forEachChild(node, child => visit(child, className));
      } else if (ts.isModuleBlock(node) || ts.isModuleDeclaration(node) || ts.isBlock(node)) {
        ts.forEachChild(node, child => visit(child, className));
      } else if (
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node) ||
        ts.isImportDeclaration(node) ||
        ts.isExportDeclaration(node)
      ) {
        // skip
      } else {
        ts.forEachChild(node, child => visit(child, className));
      }
    };

    visit(sourceFile, undefined);

    // Top-level const x = () => {} / function expressions
    for (const statement of sourceFile.statements) {
      if (ts.isVariableStatement(statement)) {
        for (const decl of statement.declarationList.declarations) {
          if (!decl.name || !ts.isIdentifier(decl.name)) continue;
          const init = decl.initializer;
          if (!init) continue;
          if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
            collected.push({
              node: init,
              qualifiedName: decl.name.text,
              isMethod: false,
            });
          }
        }
      }
    }

    const maxFns = Math.min(Math.max(merged.maxItems, 1), 200);
    const filtered = collected.filter(f => this.shouldIncludeFunction(f.node, merged.includePrivate));
    const slice = filtered.slice(0, maxFns);

    if (slice.length === 0) {
      return '';
    }

    const parts: string[] = [];
    parts.push(`── semantic · ${slice.length} fns · ${SEMANTIC_FMT} ──`);

    const printer = ts.createPrinter({ removeComments: true });

    for (const item of slice) {
      const block = this.formatOneFunction(sourceFile, item, merged, printer);
      if (block) {
        parts.push(block);
        parts.push('');
      }
    }

    return parts.join('\n').trimEnd();
  }

  private shouldIncludeFunction(node: ts.FunctionLikeDeclaration, includePrivate: boolean): boolean {
    if (includePrivate) return true;

    const mods = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    if (mods?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword)) {
      return false;
    }

    const propName = ts.isConstructorDeclaration(node) ? undefined : node.name;
    if (propName && ts.isPrivateIdentifier(propName)) {
      return false;
    }

    if (propName && ts.isIdentifier(propName) && propName.text.startsWith('_')) {
      return false;
    }

    return true;
  }

  private formatOneFunction(
    sourceFile: ts.SourceFile,
    item: CollectedFunction,
    options: Required<OutlineOptions>,
    printer: ts.Printer
  ): string {
    const { node, qualifiedName } = item;
    const sig = node;

    const asyncKw = sig.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ? 'async ' : '';
    const staticKw =
      ts.isMethodDeclaration(sig) && sig.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword)
        ? 'static '
        : '';
    const exportKw =
      ts.isFunctionDeclaration(sig) && sig.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
        ? 'export '
        : '';

    const paramNames = sig.parameters.map(p => this.formatParamName(p, sourceFile)).join(', ');
    const wrapperCallee = this.getSingleCallWrapperCallee(sig.body, sourceFile);
    const isWrapper = wrapperCallee !== '';

    let sigLine = '';
    if (ts.isConstructorDeclaration(sig)) {
      sigLine = qualifiedName.includes('.') ? `${qualifiedName}(${paramNames})` : `constructor(${paramNames})`;
    } else if (ts.isMethodDeclaration(sig)) {
      const methodName = sig.name.getText(sourceFile);
      const name = qualifiedName.includes('.') ? qualifiedName : methodName;
      sigLine = `${staticKw}${asyncKw}${name}(${paramNames})`;
    } else if (ts.isFunctionDeclaration(sig)) {
      const fname = sig.name ? sig.name.text : 'anonymous';
      sigLine = `${exportKw}${asyncKw}${fname}(${paramNames})`;
    } else {
      sigLine = `${asyncKw}${qualifiedName}(${paramNames})`;
    }

    const lines: string[] = [];
    lines.push(`fn ${truncateText(sigLine, SIG_LINE_MAX)}`);

    if (options.extractComments) {
      const doc = this.getJsDocSummary(sig);
      if (doc && !this.isRedundantDoc(doc, wrapperCallee, qualifiedName)) {
        const docCap = options.detail === 'detailed' ? 200 : DOC_MAX_STANDARD;
        lines.push(`doc: ${this.truncateAtWordBoundary(doc, docCap)}`);
      }
    }

    const inputs = sig.parameters
      .map(p => (isWrapper ? this.formatParamName(p, sourceFile) : this.formatParamCompact(p, sourceFile, printer)))
      .join(', ');

    const retType =
      sig.type !== undefined
        ? this.formatTypeCompact(sig.type, sourceFile, printer)
        : this.inferReturnKind(sig.body);

    if (!this.shouldOmitIoLine(isWrapper, retType)) {
      lines.push(truncateText(`io: ${inputs || '∅'} -> ${retType}`, IO_LINE_MAX));
    }

    if (options.detail === 'basic') {
      return lines.join('\n');
    }

    const bodyInfo = this.summarizeBody(sourceFile, sig.body, options.detail, sig);

    let controlSkeleton:
      | {
          branchPoints: number;
          loopPoints: number;
          branchHints: string[];
          loopHints: string[];
        }
      | undefined;
    if (sig.body !== undefined && ts.isBlock(sig.body)) {
      controlSkeleton = this.collectControlSkeleton(sig.body, sourceFile);
    }

    let flowLines = bodyInfo.flow;
    if (ts.isConstructorDeclaration(sig) && sig.body !== undefined && ts.isBlock(sig.body)) {
      flowLines = this.replaceConstructorFlow(sig.body, sourceFile);
    } else {
      flowLines = this.collapseRedundantFlow(flowLines);
      if (controlSkeleton) {
        flowLines = this.refineFlowO3(flowLines, {
          branchHints: controlSkeleton.branchHints,
          loopHints: controlSkeleton.loopHints,
          dependsCount: bodyInfo.calls.size,
          statementCount: sig.body !== undefined && ts.isBlock(sig.body) ? sig.body.statements.length : 0,
        });
      }
    }
    flowLines = this.compressWrapperFlow(flowLines, sig.body, sourceFile);
    flowLines = this.pruneWeakFlow(flowLines);
    flowLines = this.balanceFlowSteps(flowLines);
    flowLines = this.compressFlowRuns(flowLines);
    flowLines = this.patternizeFallbackExtractorFlow(flowLines);
    if (controlSkeleton) {
      flowLines = this.patternizeGuardReturnFlow(flowLines, controlSkeleton.branchHints);
    }
    flowLines = this.aggregateLoggerFlow(flowLines);

    const sketchTags =
      sig.body !== undefined && ts.isBlock(sig.body)
        ? this.collectOrderedPipelineTags(sig.body, sourceFile)
        : [];

    const dependsList = this.clusterDepends([...bodyInfo.calls])
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 28);
    const singleInvoke = this.getSingleInvokeFlow(flowLines);
    const inlineSingleCall =
      isWrapper && singleInvoke !== '' && this.hasNoControl(controlSkeleton);
    let emitDependsList =
      (isWrapper && singleInvoke !== '' && this.depListCoversCall(dependsList, singleInvoke)) || inlineSingleCall
        ? []
        : dependsList;
    const isCtor = ts.isConstructorDeclaration(sig);
    const sketchStr =
      sketchTags.length >= 2 && !isCtor ? this.formatFlowSketch(sketchTags) : '';
    const emitPath = sketchStr !== '' && this.shouldEmitPath(flowLines, isCtor);
    emitDependsList = this.pruneDependsCoveredByOutput(
      emitDependsList,
      flowLines,
      emitPath ? sketchStr : ''
    );

    const inlinePureReturn =
      emitDependsList.length === 0 &&
      flowLines.length === 1 &&
      flowLines[0] === FLOW.ret &&
      controlSkeleton !== undefined &&
      controlSkeleton.branchPoints === 0 &&
      controlSkeleton.loopPoints === 0;
    if (inlinePureReturn) {
      lines[0] = `${lines[0]} -> ${retType}`;
      const ioIndex = lines.findIndex(line => line.startsWith('io:'));
      if (ioIndex >= 0) {
        lines.splice(ioIndex, 1);
      }
      flowLines = [];
    }

    const inlineReturnCall =
      !inlineSingleCall &&
      emitDependsList.length === 1 &&
      flowLines.length === 1 &&
      flowLines[0] === FLOW.ret &&
      this.hasNoControl(controlSkeleton);
    if (inlineReturnCall) {
      lines[0] = `${lines[0]} -> ${retType} = ${emitDependsList[0]}`;
      const ioIndex = lines.findIndex(line => line.startsWith('io:'));
      if (ioIndex >= 0) {
        lines.splice(ioIndex, 1);
      }
      flowLines = [];
      emitDependsList = [];
    }

    if (inlineSingleCall) {
      const ret = this.shouldOmitIoLine(isWrapper, retType) ? '' : ` -> ${retType}`;
      lines[0] = `${lines[0]}${ret} = ${singleInvoke}`;
      const ioIndex = lines.findIndex(line => line.startsWith('io:'));
      if (ioIndex >= 0) {
        lines.splice(ioIndex, 1);
      }
      flowLines = [];
      emitDependsList = [];
    }

    if (emitDependsList.length > 0) {
      lines.push(`dep: ${emitDependsList.join(', ')}`);
    }

    const flowWorthPrinting =
      flowLines.length > 0 &&
      (!emitPath || flowLines.some(l => this.isCriticalFlowLine(l)));

    const emitControl =
      controlSkeleton !== undefined &&
      !(flowWorthPrinting && this.isControlCoveredByEarlyReturns(controlSkeleton.branchHints, flowLines));
    if (emitControl && controlSkeleton) {
      const bp = controlSkeleton.branchPoints;
      const lp = controlSkeleton.loopPoints;
      const hintParts = this.filterControlHintsCoveredByFlow(
        [...controlSkeleton.branchHints, ...controlSkeleton.loopHints],
        flowWorthPrinting ? flowLines : []
      );
      if (lp > 0 || hintParts.length > 0) {
        const core = `${bp}br ${lp}lp`;
        lines.push(hintParts.length > 0 ? `ctl: ${core} | ${hintParts.join(' | ')}` : `ctl: ${core}`);
      }
    }

    if (sketchStr && emitPath) {
      lines.push(`path: ${sketchStr}`);
    }

    if (flowWorthPrinting) {
      if (flowLines.length === 1) {
        lines.push(`flow: ${flowLines[0]}`);
      } else {
        lines.push('flow:');
        for (const fl of this.formatFlowBlock(flowLines)) {
          lines.push(fl);
        }
      }
    }

    if (options.detail === 'detailed') {
      if (bodyInfo.sideEffects.size > 0) {
        const fx = [...bodyInfo.sideEffects]
          .filter(name => name !== 'Logger.debug')
          .filter(name => !this.flowMentionsCall(flowLines, name))
          .filter(name => !this.outputMentionsCall(lines, name))
          .filter(name => !this.depListCoversCall(emitDependsList, name))
          .slice(0, 15);
        if (fx.length > 0) {
          lines.push(`fx: ${fx.join(', ')}`);
        }
      }
      if (bodyInfo.throws.length > 0) {
        lines.push(`throw: ${bodyInfo.throws.slice(0, 6).join('; ')}`);
      }
    }

    return lines.join('\n');
  }

  private getJsDocSummary(node: ts.Node): string {
    const docs = ts.getJSDocCommentsAndTags(node);
    if (!docs.length) return '';

    const parts: string[] = [];
    for (const doc of docs) {
      if (ts.isJSDoc(doc)) {
        const c = doc.comment;
        if (typeof c === 'string') {
          parts.push(c);
        } else if (Array.isArray(c)) {
          for (const part of c) {
            if (typeof part === 'string') {
              parts.push(part);
            } else if (part.kind === ts.SyntaxKind.JSDocText) {
              parts.push((part as ts.JSDocText).text);
            }
          }
        }
      }
    }

    return truncateText(parts.join(' ').replace(/\s+/g, ' ').trim(), 200);
  }

  private truncateAtWordBoundary(text: string, maxLength: number): string {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) return normalized;

    const slice = normalized.slice(0, Math.max(0, maxLength - 1));
    const boundary = slice.search(/\s+\S*$/);
    if (boundary > 40) {
      return `${slice.slice(0, boundary).trimEnd()}…`;
    }

    return `${slice.trimEnd()}…`;
  }

  private formatParamCompact(
    param: ts.ParameterDeclaration,
    sourceFile: ts.SourceFile,
    printer: ts.Printer
  ): string {
    const name = this.formatParamName(param, sourceFile);
    const type = param.type ? this.formatTypeCompact(param.type, sourceFile, printer) : 'any';
    return `${name}: ${type}`;
  }

  private formatParamName(param: ts.ParameterDeclaration, sourceFile: ts.SourceFile): string {
    const raw = ts.isIdentifier(param.name)
      ? param.name.text
      : param.name.getText(sourceFile).replace(/\s+/g, ' ');
    const optional = param.questionToken || param.initializer ? '?' : '';
    return `${raw}${optional}`;
  }

  private formatTypeCompact(type: ts.TypeNode, sourceFile: ts.SourceFile, printer: ts.Printer): string {
    if (ts.isTypeLiteralNode(type)) {
      const members = type.members
        .map(member => this.formatTypeLiteralMember(member, sourceFile, printer))
        .filter(Boolean);
      return `{${truncateText(members.join(','), 92)}}`;
    }

    if (ts.isFunctionTypeNode(type) || ts.isConstructorTypeNode(type)) {
      return 'fn';
    }

    if (ts.isUnionTypeNode(type)) {
      return type.types.map(t => this.formatTypeCompact(t, sourceFile, printer)).join('|');
    }

    if (ts.isIntersectionTypeNode(type)) {
      return type.types.map(t => this.formatTypeCompact(t, sourceFile, printer)).join('&');
    }

    if (ts.isArrayTypeNode(type)) {
      return `${this.formatTypeCompact(type.elementType, sourceFile, printer)}[]`;
    }

    if (ts.isTupleTypeNode(type)) {
      return `[${type.elements.map(t => this.formatTypeCompact(t, sourceFile, printer)).join(',')}]`;
    }

    return truncateText(printer.printNode(ts.EmitHint.Unspecified, type, sourceFile).replace(/\s+/g, ' '), 72);
  }

  private formatTypeLiteralMember(
    member: ts.TypeElement,
    sourceFile: ts.SourceFile,
    printer: ts.Printer
  ): string {
    if (ts.isPropertySignature(member) && member.name) {
      const name = member.name.getText(sourceFile).replace(/\s+/g, ' ');
      const optional = member.questionToken ? '?' : '';
      const type = member.type ? this.formatTypeCompact(member.type, sourceFile, printer) : 'any';
      return `${name}${optional}:${type}`;
    }

    if (ts.isMethodSignature(member) && member.name) {
      return `${member.name.getText(sourceFile)}:fn`;
    }

    if (ts.isIndexSignatureDeclaration(member)) {
      return '[k]:any';
    }

    return '';
  }

  private getSingleCallWrapperCallee(body: ts.ConciseBody | undefined, sourceFile: ts.SourceFile): string {
    if (!body || !ts.isBlock(body) || body.statements.length !== 1) return '';

    const st0 = body.statements[0];
    let expr: ts.Expression | undefined;
    if (ts.isReturnStatement(st0)) {
      expr = st0.expression;
    } else if (ts.isExpressionStatement(st0)) {
      expr = st0.expression;
    }
    if (!expr) return '';
    if (ts.isAwaitExpression(expr)) expr = expr.expression;
    if (!ts.isCallExpression(expr)) return '';
    return this.getCalleeNameCompact(expr.expression, sourceFile);
  }

  private isRedundantDoc(doc: string, wrapperCallee: string, qualifiedName: string): boolean {
    const normalized = doc.trim().toLowerCase();
    if (wrapperCallee && normalized.length <= 80) return true;
    const name = qualifiedName.split('.').pop() ?? '';
    if (wrapperCallee && name !== '' && normalized.includes(name)) return true;
    if (normalized.length > 80 || name === '') return false;

    const nameTokens = this.splitIdentifierTokens(name);
    if (nameTokens.length === 0) return false;
    const docWords = new Set(normalized.split(/[^a-z0-9]+/).filter(w => w.length >= 3));
    if (docWords.size > nameTokens.length + 2) return false;
    const hits = nameTokens.filter(t => docWords.has(t)).length;
    return hits / nameTokens.length >= 0.67;
  }

  private splitIdentifierTokens(name: string): string[] {
    return name
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(t => t.length >= 3);
  }

  private formatSwitchCases(node: ts.SwitchStatement, sourceFile: ts.SourceFile): string {
    const labels = node.caseBlock.clauses.map(clause => {
      const label = ts.isDefaultClause(clause)
        ? 'def'
        : clause.expression.getText(sourceFile).replace(/\s+/g, ' ');
      const action = this.getFirstStatementCall(clause.statements, sourceFile);
      return action ? `${label}->${action}` : label;
    });
    return `switch(${labels.join(',')})`;
  }

  private getFirstStatementCall(statements: ts.NodeArray<ts.Statement>, sourceFile: ts.SourceFile): string {
    for (const statement of statements) {
      const calls: string[] = [];
      this.collectCallsFromStatement(statement, sourceFile, calls);
      const first = calls.find(call => !call.startsWith('Logger.'));
      if (first) return first;
    }
    return '';
  }

  private collectCallsFromStatement(statement: ts.Statement, sourceFile: ts.SourceFile, bucket: string[]): void {
    if (ts.isExpressionStatement(statement)) {
      this.appendOrderedCallsFromExpr(statement.expression, sourceFile, bucket);
      return;
    }
    if (ts.isReturnStatement(statement) && statement.expression) {
      this.appendOrderedCallsFromExpr(statement.expression, sourceFile, bucket);
      return;
    }
    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (decl.initializer) this.appendOrderedCallsFromExpr(decl.initializer, sourceFile, bucket);
      }
      return;
    }
    if (ts.isBlock(statement)) {
      for (const st of statement.statements) this.collectCallsFromStatement(st, sourceFile, bucket);
      return;
    }
    if (ts.isTryStatement(statement)) {
      this.collectCallsFromStatement(statement.tryBlock, sourceFile, bucket);
      return;
    }
    ts.forEachChild(statement, child => {
      if (ts.isCallExpression(child)) {
        const name = this.getCalleeNameCompact(child.expression, sourceFile);
        if (name) bucket.push(name);
      }
    });
  }

  private shouldOmitIoLine(isWrapper: boolean, retType: string): boolean {
    if (!isWrapper) return false;
    const normalized = retType.replace(/\s+/g, '');
    return normalized === 'void' || normalized === 'Promise<void>';
  }

  private flowMentionsCall(flow: string[], name: string): boolean {
    return flow.some(line => {
      if (line === FLOW.invoke(name) || line.includes(` ${name}`) || line.endsWith(name)) return true;
      if (name.startsWith('Logger.') && line.startsWith('log:')) {
        const method = name.replace(/^Logger\./, '');
        return line.includes(method);
      }
      return false;
    });
  }

  private outputMentionsCall(lines: string[], name: string): boolean {
    return lines.some(line => line.includes(`= ${name}`) || line.endsWith(name));
  }

  private depListCoversCall(depends: string[], name: string): boolean {
    return depends.some(dep => dep === name || (dep.endsWith('*') && name.startsWith(dep.slice(0, -1))));
  }

  private pruneDependsCoveredByOutput(depends: string[], flow: string[], pathText: string): string[] {
    const hasLogFlow = flow.some(line => line.startsWith('log:'));
    return depends.filter(dep => {
      if (hasLogFlow && (dep === 'Logger.*' || dep.startsWith('Logger.'))) return false;
      if (this.flowOrPathMentionsDependency(flow, pathText, dep)) return false;
      return true;
    });
  }

  private flowOrPathMentionsDependency(flow: string[], pathText: string, dep: string): boolean {
    if (pathText.includes(dep)) return true;
    const extractor = dep.match(/^this\.(\w+)\.extract$/);
    if (extractor && flow.some(line => line.includes(`try ${extractor[1]} -> cache -> return`))) {
      return true;
    }
    if (dep === 'this.setInCache' && flow.some(line => line.includes('-> cache -> return'))) {
      return true;
    }
    return flow.some(line => line === FLOW.invoke(dep) || line.includes(`= ${dep}`) || line.includes(dep));
  }

  private hasNoControl(
    controlSkeleton:
      | {
          branchPoints: number;
          loopPoints: number;
          branchHints: string[];
          loopHints: string[];
        }
      | undefined
  ): boolean {
    return (
      controlSkeleton === undefined ||
      (controlSkeleton.branchPoints === 0 && controlSkeleton.loopPoints === 0)
    );
  }

  private isControlCoveredByEarlyReturns(branchHints: string[], flow: string[]): boolean {
    if (branchHints.length === 0) return false;
    const earlyReturns = flow.filter(line => line.startsWith(`${FLOW.ret} · if (`));
    if (earlyReturns.length < branchHints.length) return false;
    return branchHints.every(hint => earlyReturns.some(line => line.includes(hint)));
  }

  private filterControlHintsCoveredByFlow(hints: string[], flow: string[]): string[] {
    return hints.filter(hint => !flow.some(line => line.includes(hint)));
  }

  private formatFlowBlock(flow: string[]): string[] {
    const out: string[] = [];
    let childIndent = false;
    for (const line of flow) {
      const indent = childIndent && !line.startsWith('…(') ? '    ' : '  ';
      out.push(`${indent}${line}`);
      if (line === FLOW.tryOpen || line.startsWith('switch ') || line.startsWith('@ ')) {
        childIndent = true;
      }
    }
    return out;
  }

  private patternizeGuardReturnFlow(flow: string[], branchHints: string[]): string[] {
    if (branchHints.length !== 1) return flow;
    const retIndex = flow.indexOf(FLOW.ret);
    if (retIndex <= 0) return flow;

    const beforeReturn = flow.slice(0, retIndex);
    if (beforeReturn.some(line => line.startsWith(FLOW.ret) || line.startsWith(':= '))) {
      return flow;
    }

    const actions = beforeReturn
      .filter(line => !line.startsWith('-> Logger.info') && !line.startsWith('-> Logger.debug'))
      .map(line => line.replace(/^-> /, ''));
    if (actions.length === 0) return flow;

    const guard = `${branchHints[0]} -> ${actions.join(' -> ')} -> return`;
    const after = flow
      .slice(retIndex + 1)
      .filter(line => !line.startsWith('-> Logger.debug'));
    return [guard, ...after];
  }

  private aggregateLoggerFlow(flow: string[]): string[] {
    const out: string[] = [];
    let i = 0;
    while (i < flow.length) {
      if (!flow[i].startsWith('-> Logger.')) {
        out.push(flow[i]);
        i++;
        continue;
      }

      const logs: string[] = [];
      while (i < flow.length && flow[i].startsWith('-> Logger.')) {
        logs.push(flow[i].replace(/^-> Logger\./, ''));
        i++;
      }
      out.push(`log: ${logs.join(', ')}`);
    }
    return out;
  }

  private getSingleInvokeFlow(flow: string[]): string {
    if (flow.length !== 1) return '';
    const line = flow[0];
    return line.startsWith('-> ') ? line.slice(3).trim() : '';
  }

  private clusterDepends(depends: string[]): string[] {
    const remaining: string[] = [];
    const groups = new Map<string, string[]>();
    const groupPrefixes = [
      'Logger.',
      'vscode.window.',
      'vscode.workspace.fs.',
      'vscode.workspace.',
      'vscode.commands.',
      'vscode.env.clipboard.',
    ];

    for (const dep of depends) {
      const prefix = groupPrefixes.find(p => dep.startsWith(p));
      if (prefix) {
        const bucket = groups.get(prefix) ?? [];
        bucket.push(dep);
        groups.set(prefix, bucket);
      } else {
        remaining.push(dep);
      }
    }

    for (const [prefix, items] of groups) {
      if (items.length >= 2) {
        remaining.push(`${prefix}*`);
      } else {
        remaining.push(items[0]);
      }
    }

    return this.dedupePreserveOrder(remaining);
  }

  private inferReturnKind(body: ts.ConciseBody | undefined): string {
    if (!body) return 'void';
    if (ts.isBlock(body)) {
      for (let i = body.statements.length - 1; i >= 0; i--) {
        const st = body.statements[i];
        if (ts.isReturnStatement(st) && st.expression) {
          return 'infer';
        }
      }
      return 'void';
    }
    return 'expr';
  }

  /** Flow lines that carry little signal vs ordered path/sketch. */
  private isWeakFlowLine(line: string): boolean {
    if (line === FLOW.decl || line === FLOW.misc || line === FLOW.exprBody) return true;
    if (line.startsWith('… seq(')) return true;
    if (line.startsWith('stmt:Break')) return true;
    return false;
  }

  private isCriticalFlowLine(line: string): boolean {
    return (
      line.startsWith('<- return ·') ||
      line.startsWith('!! throw') ||
      line.startsWith('try') ||
      line.startsWith('switch') ||
      line.startsWith('@ ') ||
      line.startsWith('ctrl:')
    );
  }

  /** Emit ordered path when Flow is weak or truncated (and not constructor). */
  private shouldEmitPath(flow: string[], isCtor: boolean): boolean {
    if (isCtor) return false;
    const meaningful = flow.filter(l => !this.isWeakFlowLine(l));
    return meaningful.length < 2 || flow.some(l => l.startsWith('…('));
  }

  private pruneWeakFlow(flow: string[]): string[] {
    if (flow.length === 0) return flow;

    const meaningful = flow.filter(l => !this.isWeakFlowLine(l));
    if (meaningful.length === 0) {
      return flow.includes(FLOW.ret) ? [FLOW.ret] : flow.slice(0, 1);
    }

    const pruned = flow.filter(line => {
      if (line === FLOW.decl || line === FLOW.misc || line.startsWith('stmt:Break')) return false;
      if (line.startsWith('… seq(')) return false;
      return true;
    });

    return pruned.length > 0 ? pruned : meaningful;
  }

  private compressFlowRuns(flow: string[]): string[] {
    const out: string[] = [];
    let i = 0;
    while (i < flow.length) {
      const line = flow[i];
      if (line.startsWith('-> ')) {
        let j = i + 1;
        while (j < flow.length && flow[j] === line) {
          j++;
        }
        const run = j - i;
        out.push(run > 1 ? `${line}×${run}` : line);
        i = j;
        continue;
      }
      out.push(line);
      i++;
    }
    return out;
  }

  private patternizeFallbackExtractorFlow(flow: string[]): string[] {
    const extractors: string[] = [];
    let hasCacheReturn = false;
    for (let i = 0; i < flow.length; i++) {
      const line = flow[i];
      const m = line.match(/^:= result ← this\.(\w+)\.extract$/);
      if (m) {
        extractors.push(m[1]);
        continue;
      }
      if ((line === FLOW.ret || line.startsWith(`${FLOW.ret} · if (`)) && extractors.length === 0) {
        hasCacheReturn = true;
      }
    }

    if (extractors.length < 2 || !flow.some(line => line === '-> this.setInCache')) {
      return flow;
    }

    const out: string[] = [];
    if (flow[0]?.startsWith('ctrl:')) {
      out.push(flow[0]);
    }
    if (hasCacheReturn) {
      out.push('cache? -> return');
    }
    for (const extractor of extractors) {
      out.push(`try ${extractor} -> cache -> return`);
    }
    return out;
  }

  /**
   * Single-statement wrappers: collapse to one invoke line when Flow would only be ~misc/seq noise.
   */
  private compressWrapperFlow(
    flow: string[],
    body: ts.ConciseBody | undefined,
    sourceFile: ts.SourceFile
  ): string[] {
    if (!body || !ts.isBlock(body) || body.statements.length !== 1) return flow;

    let callExpr: ts.CallExpression | undefined;
    const st0 = body.statements[0];
    if (ts.isReturnStatement(st0) && st0.expression) {
      const e = st0.expression;
      if (ts.isCallExpression(e)) callExpr = e;
      else if (ts.isAwaitExpression(e) && ts.isCallExpression(e.expression)) callExpr = e.expression;
    } else if (ts.isExpressionStatement(st0)) {
      const e = st0.expression;
      if (ts.isCallExpression(e)) callExpr = e;
      else if (ts.isAwaitExpression(e) && ts.isCallExpression(e.expression)) callExpr = e.expression;
    }
    if (!callExpr) return flow;

    const name = this.getCalleeNameCompact(callExpr.expression, sourceFile);
    if (!name) return flow;
    const single = [FLOW.invoke(truncateText(name, 56))];
    const weakOnly =
      flow.length > 0 && flow.every(l => this.isWeakFlowLine(l) || l === FLOW.ret || l.startsWith('->'));
    if (flow.length <= 3 && weakOnly) return single;
    return flow;
  }

  private isTrivialSingleStatementBody(body: ts.Block): boolean {
    if (body.statements.length !== 1) return false;
    const st0 = body.statements[0];
    if (ts.isReturnStatement(st0) && st0.expression) {
      const e = st0.expression;
      return ts.isCallExpression(e) || (ts.isAwaitExpression(e) && ts.isCallExpression(e.expression));
    }
    if (ts.isExpressionStatement(st0)) {
      const e = st0.expression;
      return ts.isCallExpression(e) || (ts.isAwaitExpression(e) && ts.isCallExpression(e.expression));
    }
    return false;
  }

  /**
   * Stable short callee / dependency label: avoids embedding multi-line source from `getText`.
   * Examples: `DirTreeGenerator.generate`, `vscode.window.showWarningMessage.then`.
   */
  private getCalleeNameCompact(expr: ts.Expression, sourceFile: ts.SourceFile): string {
    const strip = (s: string) => s.split('\n')[0].trim().replace(/\s+/g, ' ');
    const fallback = (e: ts.Expression) => truncateText(strip(e.getText(sourceFile)), 72);

    if (ts.isIdentifier(expr)) {
      return expr.text;
    }
    if (expr.kind === ts.SyntaxKind.SuperKeyword) {
      return 'super';
    }
    if (ts.isPropertyAccessExpression(expr)) {
      const right = expr.name.text;
      const leftExpr = expr.expression;

      if (ts.isNewExpression(leftExpr)) {
        const clsExpr = leftExpr.expression;
        const base = ts.isIdentifier(clsExpr)
          ? clsExpr.text
          : truncateText(strip(clsExpr.getText(sourceFile)), 32);
        return `${base}.${right}`;
      }

      if (ts.isCallExpression(leftExpr)) {
        const inner = this.getCallChainRootLabel(leftExpr.expression, sourceFile);
        return inner ? `${inner}.${right}` : right;
      }

      const left = this.getCalleeNameCompact(leftExpr, sourceFile);
      return left ? `${left}.${right}` : right;
    }

    if (ts.isElementAccessExpression(expr)) {
      return fallback(expr);
    }

    if (ts.isCallExpression(expr)) {
      return this.getCallChainRootLabel(expr, sourceFile) || fallback(expr);
    }

    return fallback(expr);
  }

  private getCallChainRootLabel(expr: ts.Expression, sourceFile: ts.SourceFile): string {
    if (ts.isIdentifier(expr)) return expr.text;
    if (ts.isPropertyAccessExpression(expr)) return this.getCalleeNameCompact(expr, sourceFile);
    if (ts.isNewExpression(expr)) {
      const clsExpr = expr.expression;
      return ts.isIdentifier(clsExpr)
        ? clsExpr.text
        : truncateText(clsExpr.getText(sourceFile).split('\n')[0].trim().replace(/\s+/g, ' '), 36);
    }
    return '';
  }

  private balanceFlowSteps(flow: string[]): string[] {
    return flow;
  }

  /**
   * P4: triple refinement (-O3 style): (1) merge/simplify raw steps (2) strip redundant branch markers
   * when Branch basis exists (3) compress guard chains & repetition.
   */
  private refineFlowO3(flow: string[], meta: FlowRefineMeta): string[] {
    let f = this.o3Pass1_inlineAndMerge(flow);
    f = this.o3Pass2_stripRedundantBranchMarkers(f, meta);
    f = this.o3Pass3_compressChains(f, meta);
    return f;
  }

  /** O3 pass 1 — source-derived steps: merge `if (c)` + `<- return`, drop redundant seq padding after lone return. */
  private o3Pass1_inlineAndMerge(flow: string[]): string[] {
    const out: string[] = [];
    let i = 0;
    while (i < flow.length) {
      const line = flow[i];
      const next = flow[i + 1];
      if (line.startsWith('if (') && next === FLOW.ret) {
        out.push(`${FLOW.ret} · ${truncateText(line, 78)}`);
        i += 2;
        continue;
      }
      if (line === FLOW.ret && next !== undefined && next.startsWith('… seq(')) {
        out.push(FLOW.ret);
        i += 2;
        continue;
      }
      out.push(line);
      i++;
    }
    return out;
  }

  /** O3 pass 2 — Branch basis already lists predicates; drop duplicate `if (...)` lines from Flow (P2). */
  private o3Pass2_stripRedundantBranchMarkers(flow: string[], meta: FlowRefineMeta): string[] {
    if (meta.branchHints.length === 0) return flow;
    return flow.filter(line => !line.startsWith('if ('));
  }

  /** O3 pass 3 — compress multi-guard pipelines & repetitive debug-only flows (P3). */
  private o3Pass3_compressChains(flow: string[], meta: FlowRefineMeta): string[] {
    const deduped: string[] = [];
    for (const line of flow) {
      const prev = deduped[deduped.length - 1];
      if (deduped.length === 0 || prev !== line || line.startsWith('-> ')) {
        deduped.push(line);
      }
    }
    let f = deduped;

    if (meta.branchHints.length >= 4 && f.length >= 5) {
      const summary = `ctrl: branches×${meta.branchHints.length}`;
      return [summary, ...f];
    }

    if (f.length === 2 && f[0] === FLOW.ret && f[1].startsWith('… seq(')) {
      return [FLOW.ret];
    }

    const dbg = f.filter(l => l.startsWith('-> Logger.debug'));
    if (dbg.length >= 3 && dbg.length === f.length) {
      return [truncateText(`-> Logger.debug (×${dbg.length})`, 80)];
    }

    return f;
  }

  /**
   * Decision / iteration counts + short predicate samples for LLM-oriented control skeleton.
   * Not a full CFG; nested constructs are counted when traversed.
   */
  private collectControlSkeleton(body: ts.Block, sourceFile: ts.SourceFile): {
    branchPoints: number;
    loopPoints: number;
    branchHints: string[];
    loopHints: string[];
  } {
    let branchPoints = 0;
    let loopPoints = 0;
    const branchHints: string[] = [];
    const loopHints: string[] = [];

    const pushBranch = (label: string) => {
      branchPoints++;
      if (branchHints.length < 4) {
        const normalized = label.replace(/\s+/g, ' ');
        branchHints.push(normalized.startsWith('switch(') ? normalized : truncateText(normalized, 82));
      }
    };
    const pushLoop = (label: string) => {
      loopPoints++;
      if (loopHints.length < 4) {
        loopHints.push(truncateText(label.replace(/\s+/g, ' '), 82));
      }
    };

    const visitStatement = (st: ts.Statement): void => {
      if (ts.isBlock(st)) {
        for (const x of st.statements) {
          visitStatement(x);
        }
        return;
      }
      if (ts.isIfStatement(st)) {
        const cond = st.expression?.getText(sourceFile) ?? '';
        pushBranch(`if (${cond})`);
        if (st.thenStatement) {
          visitStatement(st.thenStatement);
        }
        if (st.elseStatement) {
          visitStatement(st.elseStatement);
        }
        return;
      }
      if (ts.isSwitchStatement(st)) {
        pushBranch(this.formatSwitchCases(st, sourceFile));
        for (const clause of st.caseBlock.clauses) {
          for (const subst of clause.statements) {
            visitStatement(subst);
          }
        }
        return;
      }
      if (ts.isTryStatement(st)) {
        pushBranch('try/catch');
        visitStatement(st.tryBlock);
        if (st.catchClause?.block) {
          visitStatement(st.catchClause.block);
        }
        if (st.finallyBlock) {
          visitStatement(st.finallyBlock);
        }
        return;
      }
      if (ts.isForStatement(st)) {
        pushLoop('for (…)');
        visitStatement(st.statement);
        return;
      }
      if (ts.isForOfStatement(st)) {
        pushLoop(`for-of ${st.expression.getText(sourceFile)}`);
        visitStatement(st.statement);
        return;
      }
      if (ts.isForInStatement(st)) {
        pushLoop(`for-in ${st.expression.getText(sourceFile)}`);
        visitStatement(st.statement);
        return;
      }
      if (ts.isWhileStatement(st)) {
        pushLoop(`while (${st.expression.getText(sourceFile)})`);
        visitStatement(st.statement);
        return;
      }
      if (ts.isDoStatement(st)) {
        pushLoop(`do … while (${st.expression.getText(sourceFile)})`);
        visitStatement(st.statement);
        return;
      }
      if (ts.isLabeledStatement(st)) {
        visitStatement(st.statement);
        return;
      }
      if (ts.isWithStatement(st)) {
        pushBranch(`with (${st.expression.getText(sourceFile)})`);
        visitStatement(st.statement);
      }
    };

    for (const st of body.statements) {
      visitStatement(st);
    }

    return { branchPoints, loopPoints, branchHints, loopHints };
  }

  private summarizeBody(
    sourceFile: ts.SourceFile,
    body: ts.ConciseBody | undefined,
    detail: 'basic' | 'standard' | 'detailed',
    functionLike?: ts.FunctionLikeDeclaration
  ): {
    flow: string[];
    calls: Set<string>;
    sideEffects: Set<string>;
    throws: string[];
  } {
    const flow: string[] = [];
    const calls = new Set<string>();
    const sideEffects = new Set<string>();
    const throws: string[] = [];

    if (!body) {
      return { flow, calls, sideEffects, throws };
    }

    if (!ts.isBlock(body)) {
      this.scanExpressionForCalls(body, sourceFile, calls, sideEffects);
      flow.push(FLOW.exprBody);
      return { flow, calls, sideEffects, throws };
    }

    for (const statement of body.statements) {
      this.processStatement(statement, sourceFile, flow, calls, sideEffects, throws, detail);
    }

    const skipMinPad =
      functionLike !== undefined && ts.isConstructorDeclaration(functionLike) && body.statements.length > 0;
    const trivialWrap = this.isTrivialSingleStatementBody(body);
    if (flow.length < MIN_FLOW_STEPS && body.statements.length > 0 && !skipMinPad && !trivialWrap) {
      flow.push(FLOW.seq(body.statements.length));
    }

    return { flow, calls, sideEffects, throws };
  }

  private processStatement(
    statement: ts.Statement,
    sourceFile: ts.SourceFile,
    flow: string[],
    calls: Set<string>,
    sideEffects: Set<string>,
    throws: string[],
    detail: 'basic' | 'standard' | 'detailed'
  ): void {
    if (ts.isIfStatement(statement)) {
      const condRaw = statement.expression?.getText(sourceFile) ?? '';
      const cond = condRaw.replace(/\s+/g, ' ');
      flow.push(truncateText(`if (${cond})`, 92));
      if (statement.thenStatement) {
        this.processEmbedded(statement.thenStatement, sourceFile, flow, calls, sideEffects, throws, detail);
      }
      if (statement.elseStatement) {
        this.processEmbedded(statement.elseStatement, sourceFile, flow, calls, sideEffects, throws, detail);
      }
      return;
    }

    if (ts.isSwitchStatement(statement)) {
      flow.push(this.formatSwitchCases(statement, sourceFile));
      for (const clause of statement.caseBlock.clauses) {
        for (const subst of clause.statements) {
          this.processStatement(subst, sourceFile, flow, calls, sideEffects, throws, detail);
        }
      }
      return;
    }

    if (ts.isForOfStatement(statement)) {
      flow.push(
        truncateText(`@ for-of ${statement.expression.getText(sourceFile).replace(/\s+/g, ' ')}`, 92)
      );
      this.processEmbedded(statement.statement, sourceFile, flow, calls, sideEffects, throws, detail);
      return;
    }
    if (ts.isForInStatement(statement)) {
      flow.push(
        truncateText(`@ for-in ${statement.expression.getText(sourceFile).replace(/\s+/g, ' ')}`, 92)
      );
      this.processEmbedded(statement.statement, sourceFile, flow, calls, sideEffects, throws, detail);
      return;
    }
    if (ts.isForStatement(statement)) {
      const condPart = statement.condition
        ? statement.condition.getText(sourceFile).replace(/\s+/g, ' ')
        : '';
      const label = condPart ? `@ for(…; ${condPart}; …)` : '@ for(…)';
      flow.push(truncateText(label, 92));
      this.processEmbedded(statement.statement, sourceFile, flow, calls, sideEffects, throws, detail);
      return;
    }
    if (ts.isWhileStatement(statement)) {
      flow.push(
        truncateText(
          `@ while (${statement.expression.getText(sourceFile).replace(/\s+/g, ' ')})`,
          92
        )
      );
      this.processEmbedded(statement.statement, sourceFile, flow, calls, sideEffects, throws, detail);
      return;
    }
    if (ts.isDoStatement(statement)) {
      flow.push(
        truncateText(
          `@ do … while (${statement.expression.getText(sourceFile).replace(/\s+/g, ' ')})`,
          92
        )
      );
      this.processEmbedded(statement.statement, sourceFile, flow, calls, sideEffects, throws, detail);
      return;
    }

    if (ts.isTryStatement(statement)) {
      flow.push(FLOW.tryOpen);
      this.processEmbedded(statement.tryBlock, sourceFile, flow, calls, sideEffects, throws, detail);
      return;
    }

    if (ts.isThrowStatement(statement)) {
      const t = statement.expression?.getText(sourceFile) ?? 'error';
      throws.push(truncateText(t, 80));
      flow.push(FLOW.throwKW);
      return;
    }

    if (ts.isReturnStatement(statement)) {
      flow.push(FLOW.ret);
      if (statement.expression) {
        this.scanExpressionForCalls(statement.expression, sourceFile, calls, sideEffects);
      }
      return;
    }

    if (ts.isVariableStatement(statement)) {
      flow.push(FLOW.decl);
      for (const decl of statement.declarationList.declarations) {
        if (decl.initializer) {
          this.scanExpressionForCalls(decl.initializer, sourceFile, calls, sideEffects);
        }
      }
      return;
    }

    if (ts.isExpressionStatement(statement)) {
      const expr = statement.expression;
      this.scanExpressionForCalls(expr, sourceFile, calls, sideEffects);

      if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        const lhsText = truncateText(expr.left.getText(sourceFile).replace(/\s+/g, ' '), 52);
        const rhsCalls: string[] = [];
        this.appendOrderedCallsFromExpr(expr.right, sourceFile, rhsCalls);
        const rhsHint = rhsCalls.slice(0, 5).join(', ');
        flow.push(rhsHint ? `:= ${lhsText} ← ${rhsHint}` : `:= ${lhsText}`);
        return;
      }

      if (ts.isCallExpression(expr)) {
        const callee = this.getCalleeNameCompact(expr.expression, sourceFile);
        flow.push(callee ? FLOW.invoke(truncateText(callee, 56)) : FLOW.invokeUnknown);
        return;
      }

      flow.push(FLOW.misc);
      return;
    }

    if (ts.isBlock(statement)) {
      for (const st of statement.statements) {
        this.processStatement(st, sourceFile, flow, calls, sideEffects, throws, detail);
      }
      return;
    }

    flow.push(FLOW.stmtKind(ts.SyntaxKind[statement.kind]));
  }

  private processEmbedded(
    statement: ts.Statement,
    sourceFile: ts.SourceFile,
    flow: string[],
    calls: Set<string>,
    sideEffects: Set<string>,
    throws: string[],
    detail: 'basic' | 'standard' | 'detailed'
  ): void {
    if (ts.isBlock(statement)) {
      for (const st of statement.statements) {
        this.processStatement(st, sourceFile, flow, calls, sideEffects, throws, detail);
      }
    } else {
      this.processStatement(statement, sourceFile, flow, calls, sideEffects, throws, detail);
    }
  }

  private scanExpressionForCalls(
    expr: ts.Expression,
    sourceFile: ts.SourceFile,
    calls: Set<string>,
    sideEffects: Set<string>
  ): void {
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n)) {
        const name = this.getCalleeNameCompact(n.expression, sourceFile);
        if (name && !this.isTrivialCall(name)) {
          calls.add(name);
          if (this.isSideEffectCall(name)) {
            sideEffects.add(name);
          }
        }
        n.arguments.forEach(arg => visit(arg));
      } else if (ts.isNewExpression(n)) {
        const short = ts.isIdentifier(n.expression)
          ? n.expression.text
          : truncateText(n.expression.getText(sourceFile).replace(/\s+/g, ' '), 36);
        const token = `new ${short}`;
        if (!this.isTrivialCall(short)) {
          calls.add(token);
        }
      } else if (ts.isPropertyAccessExpression(n)) {
        visit(n.expression);
      } else if (ts.isElementAccessExpression(n)) {
        visit(n.expression);
        visit(n.argumentExpression);
      } else {
        ts.forEachChild(n, visit);
      }
    };
    visit(expr);
  }

  private isTrivialCall(name: string): boolean {
    const base = name.split('.')[0];
    return TRIVIAL_GLOBALS.has(base);
  }

  private isSideEffectCall(name: string): boolean {
    const lower = name.toLowerCase();
    return (
      lower.includes('logger') ||
      lower.includes('writefile') ||
      lower.includes('writefile') ||
      lower.includes('clipboard') ||
      lower.includes('showinformationmessage') ||
      lower.includes('showwarningmessage') ||
      lower.includes('showerrormessage') ||
      lower.includes('vscode.') ||
      lower.startsWith('fs.') ||
      name.includes('executeCommand')
    );
  }

  /** Merge runs of identical generic steps so Flow stays skimmable for LLMs. */
  private collapseRedundantFlow(flow: string[]): string[] {
    const merged: string[] = [];
    let i = 0;
    while (i < flow.length) {
      const line = flow[i];
      if (line === FLOW.misc) {
        let j = i;
        while (j < flow.length && flow[j] === FLOW.misc) {
          j++;
        }
        const run = j - i;
        if (run >= 3) {
          merged.push(FLOW.miscRun(run));
        } else {
          for (let k = i; k < j; k++) merged.push(flow[k]);
        }
        i = j;
        continue;
      }
      if (merged.length > 0 && merged[merged.length - 1] === line) {
        i++;
        continue;
      }
      merged.push(line);
      i++;
    }
    return merged;
  }

  /** Replace generic per-statement Flow with two-step wiring narrative for constructors. */
  private replaceConstructorFlow(block: ts.Block, sourceFile: ts.SourceFile): string[] {
    const tags = this.collectOrderedPipelineTags(block, sourceFile);
    const helpers = tags.filter(t => !t.startsWith('new '));
    const news = tags.filter(t => t.startsWith('new ')).map(t => t.replace(/^new /, ''));
    const stmtCount = block.statements.length;
    const out: string[] = [];

    if (helpers.length > 0 && news.length > 0) {
      out.push(truncateText(`cfg: ${helpers.join(', ')}`, 118));
      out.push(truncateText(`wire: ${news.join(' → ')}`, 118));
    } else if (news.length > 0) {
      out.push(truncateText(`new (${stmtCount}): ${news.join(' → ')}`, 120));
    } else if (helpers.length > 0) {
      out.push(truncateText(`setup (${stmtCount}): ${helpers.join(' → ')}`, 120));
    } else {
      out.push(`init (${stmtCount}; dep)`);
    }
    return out;
  }

  /** Ordered first-seen tags for arrow sketch (RHS of assignments + calls). */
  private collectOrderedPipelineTags(block: ts.Block, sourceFile: ts.SourceFile): string[] {
    const ordered: string[] = [];
    for (const st of block.statements) {
      if (ts.isExpressionStatement(st)) {
        const ex = st.expression;
        if (ts.isBinaryExpression(ex) && ex.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
          this.appendOrderedCallsFromExpr(ex.right, sourceFile, ordered);
        } else {
          this.appendOrderedCallsFromExpr(ex, sourceFile, ordered);
        }
      } else if (ts.isVariableStatement(st)) {
        for (const d of st.declarationList.declarations) {
          if (d.initializer) {
            this.appendOrderedCallsFromExpr(d.initializer, sourceFile, ordered);
          }
        }
      }
    }
    return this.dedupePreserveOrder(ordered);
  }

  private dedupePreserveOrder(tags: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of tags) {
      if (seen.has(t)) continue;
      seen.add(t);
      out.push(t);
    }
    return out;
  }

  /** Pre-order calls and `new` for pipeline ordering (not perfect CFG — main path hint). */
  private appendOrderedCallsFromExpr(expr: ts.Expression, sourceFile: ts.SourceFile, bucket: string[]): void {
    const visit = (n: ts.Node): void => {
      if (ts.isCallExpression(n)) {
        const name = this.getCalleeNameCompact(n.expression, sourceFile);
        if (name && !this.isTrivialCall(name)) {
          bucket.push(name);
        }
        ts.forEachChild(n, visit);
      } else if (ts.isNewExpression(n)) {
        const short = ts.isIdentifier(n.expression)
          ? n.expression.text
          : truncateText(n.expression.getText(sourceFile).replace(/\s+/g, ' '), 36);
        bucket.push(`new ${short}`);
        ts.forEachChild(n, visit);
      } else {
        ts.forEachChild(n, visit);
      }
    };
    visit(expr);
  }

  private formatFlowSketch(tags: string[]): string {
    const nonLogger = tags.filter(tag => !tag.startsWith('Logger.'));
    return (nonLogger.length > 0 ? nonLogger : tags).join(' → ');
  }
}
