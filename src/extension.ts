/**
 * AI Context Generator - VSCode Extension
 * Entry point - registers commands and event handlers
 */

import * as vscode from 'vscode';
import { OutlineExtractorRegistry } from './outline/registry';
import { Logger, LogLevel } from './core/logger';
import { generate, generateToClipboard, generateToFile, generateToPreview } from './commands/generateCommand';
import { configureSettings } from './commands/configureCommand';

export function activate(context: vscode.ExtensionContext): void {
  // Initialize logger
  Logger.initialize();

  // Get log level from config
  const config = vscode.workspace.getConfiguration('aiContext');
  const logLevelConfig = config.get<string>('logLevel', 'info');

  const levelMap: Record<string, LogLevel> = {
    debug: LogLevel.DEBUG,
    info: LogLevel.INFO,
    warn: LogLevel.WARN,
    error: LogLevel.ERROR,
  };
  Logger.setLevel(levelMap[logLevelConfig] ?? LogLevel.INFO);

  Logger.info('AI Context Generator is now active');
  Logger.debug('Extension path:', context.extensionUri.fsPath);
  Logger.debug('Log level:', logLevelConfig);

  // Register commands
  const generateClipboardCmd = vscode.commands.registerCommand(
    'aiContext.generate.clipboard',
    (uri: vscode.Uri | vscode.Uri[] | undefined) => generateToClipboard(context, uri)
  );

  const generateFileCmd = vscode.commands.registerCommand(
    'aiContext.generate.file',
    (uri: vscode.Uri | vscode.Uri[] | undefined) => generateToFile(context, uri)
  );

  const generatePreviewCmd = vscode.commands.registerCommand(
    'aiContext.generate.preview',
    (uri: vscode.Uri | vscode.Uri[] | undefined) => generateToPreview(context, uri)
  );

  // Keep original command for command palette
  const generateCmd = vscode.commands.registerCommand(
    'aiContext.generate',
    (uri: vscode.Uri | vscode.Uri[] | undefined) => generate(context, uri)
  );

  const configureCommand = vscode.commands.registerCommand(
    'aiContext.configure',
    () => configureSettings()
  );

  const openLogsCommand = vscode.commands.registerCommand(
    'aiContext.openLogs',
    () => Logger.show()
  );

  // Register all disposables
  context.subscriptions.push(
    generateClipboardCmd,
    generateFileCmd,
    generatePreviewCmd,
    generateCmd,
    configureCommand,
    openLogsCommand
  );

  // Show welcome message on first activation
  showWelcomeMessage(context);
}

/**
 * Show welcome message on first activation
 */
async function showWelcomeMessage(context: vscode.ExtensionContext): Promise<void> {
  const hasShownWelcome = context.globalState.get<boolean>('hasShownWelcome', false);

  if (!hasShownWelcome) {
    const result = await vscode.window.showInformationMessage(
      'AI Context Generator is ready! Generate structured context from your code for AI assistants.',
      'View Commands',
      'Open Documentation'
    );

    if (result === 'View Commands') {
      await vscode.commands.executeCommand('workbench.action.showCommands', 'AI Context Generator');
    }

    await context.globalState.update('hasShownWelcome', true);
  }
}

/**
 * Deactivate extension
 */
export function deactivate(): void {
  Logger.info('AI Context Generator deactivated');
  Logger.dispose();
}
