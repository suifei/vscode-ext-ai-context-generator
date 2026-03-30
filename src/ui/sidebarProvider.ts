/**
 * WebView sidebar panel for AI Context Generator
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ContextGenerator } from '../core/contextGenerator';
import { Scope, OutputTarget } from '../config/constants';
import { OutputPicker } from './outputPicker';

export class SidebarProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private generator: ContextGenerator | null = null;
  private workspaceRoot: string | null = null;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtml();
    webviewView.webview.onDidReceiveMessage(data => this.handleMessage(data));

    this.initWorkspace();
  }

  private initWorkspace(): void {
    const folders = vscode.workspace.workspaceFolders;
    if (folders?.length) {
      this.workspaceRoot = folders[0].uri.fsPath;
      this.generator = new ContextGenerator(this.workspaceRoot);
    }
  }

  private async handleMessage(data: any): Promise<void> {
    switch (data.type) {
      case 'generate':
        await this.handleGenerate(data);
        break;
      case 'openSettings':
        vscode.commands.executeCommand('workbench.action.openSettings', 'aiContext');
        break;
    }
  }

  private async handleGenerate(data: any): Promise<void> {
    if (!this.generator) {
      this.postMessage({ type: 'error', message: 'No workspace folder found' });
      return;
    }

    try {
      this.postMessage({ type: 'status', message: 'Scanning files...' });

      const result = await this.generator.generate({
        scope: data.scope as Scope,
        selectedPaths: data.selectedPaths,
      });

      this.postMessage({ type: 'status', message: 'Generating output...' });

      await this.outputResult(result, data.outputTarget);
      this.postMessage({
        type: 'result',
        data: {
          fileCount: result.fileCount,
          tokenCount: result.tokenCount,
          outlineCount: result.outlineCount,
          exceededLimit: result.exceededLimit,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.postMessage({ type: 'error', message: `Failed: ${message}` });
    }
  }

  private async outputResult(result: any, outputTarget: OutputTarget): Promise<void> {
    const { content, fileCount, tokenCount } = result;
    const successMsg = (msg: string) => this.postMessage({ type: 'success', message: msg });

    switch (outputTarget) {
      case 'clipboard':
        await vscode.env.clipboard.writeText(content);
        successMsg(`Copied! ${fileCount} files, ~${tokenCount} tokens`);
        break;

      case 'file':
        if (this.workspaceRoot) {
          const config = vscode.workspace.getConfiguration('aiContext');
          const fileName = config.get<string>('outputFileName', 'ai-context.md');
          const uri = await OutputPicker.saveToFile(
            content,
            path.join(this.workspaceRoot, fileName)
          );
          if (uri) {
            successMsg(`Saved to ${uri.fsPath}`);
          }
        }
        break;

      case 'preview':
        await OutputPicker.showPreview(content);
        successMsg(`Opened! ${fileCount} files, ~${tokenCount} tokens`);
        break;
    }
  }

  private postMessage(data: any): void {
    this.view?.webview.postMessage(data);
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Context Generator</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 12px;
    }
    .container { display: flex; flex-direction: column; gap: 12px; }
    .section { display: flex; flex-direction: column; gap: 6px; }
    .section-title {
      font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground); font-weight: 600;
    }
    button, select {
      font-family: inherit; font-size: inherit;
      background: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      padding: 6px 10px; border-radius: 2px; cursor: pointer;
    }
    button.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground); border: none;
    }
    button.primary:hover { background: var(--vscode-button-hoverBackground); }
    button.secondary { background: transparent; color: var(--vscode-button-secondaryForeground); }
    .status { padding: 8px 12px; border-radius: 2px; font-size: 12px; }
    .status.success { background: var(--vscode-textBlockQuote-background); border-left: 3px solid var(--vscode-testing-iconPassed); }
    .status.error { background: var(--vscode-errorBackground); border-left: 3px solid var(--vscode-errorForeground); }
    .status.info { background: var(--vscode-textBlockQuote-background); border-left: 3px solid var(--vscode-infoForeground); }
    .radio-group { display: flex; flex-direction: column; gap: 4px; }
    .radio-item { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .result-stats {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 8px;
      background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 2px;
    }
    .stat { display: flex; flex-direction: column; gap: 2px; }
    .stat-label { font-size: 10px; color: var(--vscode-descriptionForeground); text-transform: uppercase; }
    .stat-value { font-size: 14px; font-weight: 600; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="section">
      <div class="section-title">Scope</div>
      <div class="radio-group">
        <label class="radio-item"><input type="radio" name="scope" value="workspace" checked> <span>Workspace</span></label>
        <label class="radio-item"><input type="radio" name="scope" value="folder"> <span>Folder</span></label>
        <label class="radio-item"><input type="radio" name="scope" value="selected"> <span>Selected</span></label>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Output</div>
      <select id="outputTarget">
        <option value="clipboard">Clipboard</option>
        <option value="file">File</option>
        <option value="preview">Preview</option>
      </select>
    </div>

    <button id="generateBtn" class="primary">Generate</button>

    <div id="statusArea" class="status hidden"></div>

    <div id="resultArea" class="result-stats hidden">
      <div class="stat"><span class="stat-label">Files</span><span class="stat-value" id="fileCount">-</span></div>
      <div class="stat"><span class="stat-label">Tokens</span><span class="stat-value" id="tokenCount">-</span></div>
    </div>

    <button id="settingsBtn" class="secondary">Settings</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    document.getElementById('generateBtn').onclick = () => {
      const scope = document.querySelector('input[name="scope"]:checked').value;
      const outputTarget = document.getElementById('outputTarget').value;
      setStatus('info', 'Generating...');
      vscode.postMessage({ type: 'generate', scope, outputTarget });
    };

    document.getElementById('settingsBtn').onclick = () => {
      vscode.postMessage({ type: 'openSettings' });
    };

    window.addEventListener('message', event => {
      const data = event.data;
      switch (data.type) {
        case 'status': case 'success': case 'error':
          setStatus(data.type, data.message);
          break;
        case 'result':
          showResult(data.data);
          break;
      }
    });

    function setStatus(type, message) {
      const area = document.getElementById('statusArea');
      area.className = 'status ' + type;
      area.textContent = message;
      area.classList.remove('hidden');
    }

    function showResult(data) {
      document.getElementById('fileCount').textContent = data.fileCount;
      document.getElementById('tokenCount').textContent = '~' + formatNumber(data.tokenCount);
      document.getElementById('resultArea').classList.remove('hidden');
      if (data.exceededLimit) setStatus('error', 'Token count exceeds limit!');
    }

    function formatNumber(num) {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
      return num.toString();
    }
  </script>
</body>
</html>`;
  }

  refresh(): void {
    if (this.view) {
      this.view.webview.html = this.getHtml();
      this.initWorkspace();
    }
  }
}
