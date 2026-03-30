/**
 * Generate AI context commands
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ContextGenerator } from '../core/contextGenerator';
import { Scope, OutputTarget } from '../config/constants';
import { OutputPicker } from '../ui/outputPicker';

export async function generateWorkspace(context: vscode.ExtensionContext): Promise<void> {
  await generateContext(context, { scope: 'workspace' });
}

export async function generateFolder(context: vscode.ExtensionContext): Promise<void> {
  await generateContext(context, { scope: 'folder' });
}

export async function generateSelected(context: vscode.ExtensionContext): Promise<void> {
  const selectedPaths = await getSelectedPaths();

  if (!selectedPaths || selectedPaths.length === 0) {
    vscode.window.showWarningMessage('No files selected');
    return;
  }

  await generateContext(context, { scope: 'selected', selectedPaths });
}

async function generateContext(
  context: vscode.ExtensionContext,
  options: { scope: Scope; selectedPaths?: string[] }
): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    vscode.window.showErrorMessage('No workspace folder found');
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Generating AI Context...',
      cancellable: false,
    },
    async progress => {
      try {
        progress.report({ message: 'Initializing...' });

        const generator = new ContextGenerator(workspaceRoot);
        generator.reloadFromSettings();

        const outputTarget = await OutputPicker.show();
        if (!outputTarget) return;

        progress.report({ message: 'Scanning files...' });

        const result = await generator.generate({
          scope: options.scope,
          selectedPaths: options.selectedPaths,
        });

        progress.report({ message: 'Outputting...' });

        await outputResult(result.content, outputTarget, workspaceRoot);

        showResultMessage(result);

        await context.globalState.update('lastScope', options.scope);
        await context.globalState.update('lastOutputTarget', outputTarget);

        generator.dispose();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to generate: ${message}`);
      }
    }
  );
}

async function outputResult(content: string, target: OutputTarget, workspaceRoot: string): Promise<void> {
  switch (target) {
    case 'clipboard':
      await OutputPicker.copyToClipboard(content);
      break;

    case 'file': {
      const config = vscode.workspace.getConfiguration('aiContext');
      const fileName = config.get<string>('outputFileName', 'ai-context.md');
      await OutputPicker.saveToFile(content, path.join(workspaceRoot, fileName));
      break;
    }

    case 'preview':
      await OutputPicker.showPreview(content);
      break;
  }
}

function showResultMessage(result: any): void {
  const { fileCount, tokenCount, exceededLimit } = result;

  if (exceededLimit) {
    vscode.window.showWarningMessage(
      `Generated ${fileCount} files (~${tokenCount} tokens), but exceeds limit!`,
      'View Details'
    ).then(action => {
      if (action === 'View Details') {
        vscode.window.showInformationMessage(
          `Files: ${fileCount} | Tokens: ~${tokenCount}`
        );
      }
    });
  } else {
    vscode.window.showInformationMessage(
      `Generated ${fileCount} files, ~${tokenCount} tokens`
    );
  }
}

function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

async function getSelectedPaths(): Promise<string[] | undefined> {
  // Try active editor
  if (vscode.window.activeTextEditor) {
    return [vscode.window.activeTextEditor.document.uri.fsPath];
  }
  return undefined;
}
