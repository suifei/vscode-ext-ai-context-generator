/**
 * Generate AI context command - automatically determines scope from selection
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ContextGenerator, GenerationResult } from '../core/contextGenerator';
import { OutputTarget } from '../config/constants';
import { OutputPicker } from '../ui/outputPicker';
import { Logger } from '../core/logger';

/**
 * Generate to clipboard
 */
export async function generateToClipboard(
  context: vscode.ExtensionContext,
  selectedUri: vscode.Uri | vscode.Uri[] | undefined
): Promise<void> {
  await generateWithTarget(context, selectedUri, 'clipboard');
}

/**
 * Generate to file
 */
export async function generateToFile(
  context: vscode.ExtensionContext,
  selectedUri: vscode.Uri | vscode.Uri[] | undefined
): Promise<void> {
  await generateWithTarget(context, selectedUri, 'file');
}

/**
 * Generate to preview
 */
export async function generateToPreview(
  context: vscode.ExtensionContext,
  selectedUri: vscode.Uri | vscode.Uri[] | undefined
): Promise<void> {
  await generateWithTarget(context, selectedUri, 'preview');
}

/**
 * Main generate command - automatically determines scope from selection
 * @param context Extension context
 * @param selectedUri Selected resource URI(s) from explorer (passed by VSCode)
 */
export async function generate(
  context: vscode.ExtensionContext,
  selectedUri: vscode.Uri | vscode.Uri[] | undefined
): Promise<void> {
  Logger.info('Command invoked: generate');

  const selectedPaths = getSelectedPaths(selectedUri);
  if (!selectedPaths || selectedPaths.length === 0) {
    Logger.warn('No files selected for generation');
    vscode.window.showWarningMessage('No files selected');
    return;
  }

  Logger.debug('Selected paths:', selectedPaths);
  await generateContext(context, { selectedPaths });
}

/**
 * Generate with specified output target
 */
async function generateWithTarget(
  context: vscode.ExtensionContext,
  selectedUri: vscode.Uri | vscode.Uri[] | undefined,
  outputTarget: OutputTarget
): Promise<void> {
  Logger.info(`Command invoked: generate to ${outputTarget}`);

  const selectedPaths = getSelectedPaths(selectedUri);
  if (!selectedPaths || selectedPaths.length === 0) {
    Logger.warn('No files selected for generation');
    vscode.window.showWarningMessage('No files selected');
    return;
  }

  Logger.debug('Selected paths:', selectedPaths);
  await generateContext(context, { selectedPaths, outputTarget });
}

/**
 * Get selected file paths from explorer context or active editor
 */
function getSelectedPaths(
  uriFromExplorer?: vscode.Uri | vscode.Uri[]
): string[] | undefined {
  // Priority 1: URI from explorer context menu
  if (uriFromExplorer) {
    if (Array.isArray(uriFromExplorer)) {
      return uriFromExplorer.map(uri => uri.fsPath);
    }
    return [uriFromExplorer.fsPath];
  }

  // Priority 2: Active editor file
  if (vscode.window.activeTextEditor) {
    return [vscode.window.activeTextEditor.document.uri.fsPath];
  }

  return undefined;
}

async function generateContext(
  context: vscode.ExtensionContext,
  options: { selectedPaths: string[]; outputTarget?: OutputTarget }
): Promise<void> {
  const startTime = Date.now();
  Logger.info('Starting generation with selected paths');

  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    Logger.error('No workspace folder found');
    vscode.window.showErrorMessage('No workspace folder found');
    return;
  }

  Logger.debug('Workspace root:', workspaceRoot);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Generating AI Context...',
      cancellable: false,
    },
    async progress => {
      try {
        progress.report({ message: 'Initializing...' });
        Logger.debug('Creating ContextGenerator...');

        const generator = new ContextGenerator(workspaceRoot);
        generator.reloadFromSettings();
        Logger.debug('ContextGenerator initialized and settings loaded');

        // Use provided outputTarget or show picker
        const outputTarget = options.outputTarget ?? await OutputPicker.show();
        if (!outputTarget) {
          Logger.info('Generation cancelled by user (no output target selected)');
          return;
        }

        Logger.info(`Output target: ${outputTarget}`);
        progress.report({ message: 'Scanning files...' });

        const result = await generator.generate({
          scope: 'selected',
          selectedPaths: options.selectedPaths,
        });

        Logger.logScanComplete(result.fileCount, Date.now() - startTime);
        Logger.logTokenCount(result.tokenCount, generator.getMaxTokens());

        progress.report({ message: 'Outputting...' });

        await outputResult(result.content, outputTarget, workspaceRoot);

        showResultMessage(result);

        generator.dispose();
        Logger.info('Generation completed successfully');
      } catch (error: unknown) {
        Logger.logError('generateContext', error);
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to generate: ${message}`);
      }
    }
  );
}

async function outputResult(content: string, target: OutputTarget, workspaceRoot: string): Promise<void> {
  Logger.debug(`Outputting to target: ${target}`);
  switch (target) {
    case 'clipboard':
      await OutputPicker.copyToClipboard(content);
      break;

    case 'file': {
      const config = vscode.workspace.getConfiguration('aiContext');
      const fileName = config.get<string>('outputFileName', 'ai-context.md');
      const filePath = path.join(workspaceRoot, fileName);

      // Check if file exists and confirm overwrite
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
        const confirm = await vscode.window.showWarningMessage(
          `File '${fileName}' already exists. Overwrite?`,
          { modal: true },
          'Overwrite'
        );
        if (confirm !== 'Overwrite') {
          Logger.info('File save cancelled by user');
          return;
        }
      } catch {
        // File doesn't exist, proceed with save
      }

      const encoder = new TextEncoder();
      await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), encoder.encode(content));

      // Auto-open the file after saving
      await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(filePath));
      Logger.info(`File saved and opened: ${filePath}`);
      break;
    }

    case 'preview':
      await OutputPicker.showPreview(content);
      break;
  }
}

function showResultMessage(result: GenerationResult): void {
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
