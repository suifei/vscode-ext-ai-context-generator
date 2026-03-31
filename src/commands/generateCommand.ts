/**
 * Generate AI context command - automatically determines scope from selection
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ContextGenerator, GenerationResult } from '../core/contextGenerator';
import { OutputTarget } from '../config/constants';
import { Logger } from '../core/logger';
import { getErrorMessage } from '../utils/errorUtils';

/**
 * Normalize URI inputs to a consistent array format.
 * Priority: selectedFiles (multi-selection) > selectedUri (single/clicked)
 */
function normalizeUris(
  selectedUri: vscode.Uri | vscode.Uri[] | undefined,
  selectedFiles?: vscode.Uri[]
): vscode.Uri[] | undefined {
  if (selectedFiles && selectedFiles.length > 0) {
    return selectedFiles;
  }
  if (Array.isArray(selectedUri)) {
    return selectedUri.length > 0 ? selectedUri : undefined;
  }
  return selectedUri ? [selectedUri] : undefined;
}

/**
 * Generate with specified output target
 */
async function generateWithTarget(
  context: vscode.ExtensionContext,
  selectedUri: vscode.Uri | vscode.Uri[] | undefined,
  selectedFiles: vscode.Uri[] | undefined,
  outputTarget: OutputTarget
): Promise<void> {
  Logger.info(`Command invoked: generate to ${outputTarget}`);

  const uris = normalizeUris(selectedUri, selectedFiles);
  const selectedPaths = getSelectedPaths(uris);

  if (!selectedPaths || selectedPaths.length === 0) {
    Logger.warn('No files selected for generation');
    vscode.window.showWarningMessage('No files selected');
    return;
  }

  Logger.debug('Selected paths:', selectedPaths);
  await generateContext(context, { selectedPaths, outputTarget });
}

/**
 * Generate to clipboard
 */
export async function generateToClipboard(
  context: vscode.ExtensionContext,
  selectedUri: vscode.Uri | vscode.Uri[] | undefined,
  selectedFiles?: vscode.Uri[]
): Promise<void> {
  await generateWithTarget(context, selectedUri, selectedFiles, 'clipboard');
}

/**
 * Generate to file
 */
export async function generateToFile(
  context: vscode.ExtensionContext,
  selectedUri: vscode.Uri | vscode.Uri[] | undefined,
  selectedFiles?: vscode.Uri[]
): Promise<void> {
  await generateWithTarget(context, selectedUri, selectedFiles, 'file');
}

/**
 * Generate to preview
 */
export async function generateToPreview(
  context: vscode.ExtensionContext,
  selectedUri: vscode.Uri | vscode.Uri[] | undefined,
  selectedFiles?: vscode.Uri[]
): Promise<void> {
  await generateWithTarget(context, selectedUri, selectedFiles, 'preview');
}

/**
 * Main generate command - automatically determines scope from selection
 * @param context Extension context
 * @param selectedUri Selected resource URI(s) from explorer (passed by VSCode)
 * @param selectedFiles All selected URIs from multi-selection (passed by VSCode)
 */
export async function generate(
  context: vscode.ExtensionContext,
  selectedUri: vscode.Uri | vscode.Uri[] | undefined,
  selectedFiles?: vscode.Uri[]
): Promise<void> {
  Logger.info('Command invoked: generate');

  const uris = normalizeUris(selectedUri, selectedFiles);
  const selectedPaths = getSelectedPaths(uris);

  if (!selectedPaths || selectedPaths.length === 0) {
    Logger.warn('No files selected for generation');
    vscode.window.showWarningMessage('No files selected');
    return;
  }

  Logger.debug('Selected paths:', selectedPaths);
  await generateContext(context, { selectedPaths });
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
    progress => executeGeneration(progress, workspaceRoot, options, startTime)
  );
}

async function executeGeneration(
  progress: { report: (message: { message: string }) => void },
  workspaceRoot: string,
  options: { selectedPaths: string[]; outputTarget?: OutputTarget },
  startTime: number
): Promise<void> {
  try {
    progress.report({ message: 'Initializing...' });
    Logger.debug('Creating ContextGenerator...');

    const generator = new ContextGenerator(workspaceRoot);
    generator.reloadFromSettings();
    Logger.debug('ContextGenerator initialized and settings loaded');

    // Use provided outputTarget or show picker
    const outputTarget = options.outputTarget ?? await showOutputPicker();
    if (!outputTarget) {
      Logger.info('Generation cancelled by user (no output target selected)');
      generator.dispose();
      return;
    }

    Logger.info(`Output target: ${outputTarget}`);
    progress.report({ message: 'Scanning files...' });

    const result = await generator.generate({
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
    vscode.window.showErrorMessage(`Failed to generate: ${getErrorMessage(error)}`);
  }
}

async function outputResult(content: string, target: OutputTarget, workspaceRoot: string): Promise<void> {
  Logger.debug(`Outputting to target: ${target}`);
  switch (target) {
    case 'clipboard':
      await vscode.env.clipboard.writeText(content);
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

    case 'preview': {
      const doc = await vscode.workspace.openTextDocument({
        content,
        language: 'markdown',
      });
      await vscode.window.showTextDocument(doc, { preview: true });
      break;
    }
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

/**
 * Show output target picker
 */
async function showOutputPicker(): Promise<OutputTarget | undefined> {
  const items = [
    {
      label: '$(clippy) Copy to Clipboard',
      value: 'clipboard' as OutputTarget,
    },
    {
      label: '$(file) Save to File',
      value: 'file' as OutputTarget,
    },
    {
      label: '$(preview) Open in Preview',
      value: 'preview' as OutputTarget,
    },
  ];

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select output destination',
  });

  return selected?.value;
}
