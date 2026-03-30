/**
 * AI Context Generator - VSCode Extension
 * Entry point - registers commands and event handlers
 */

import * as vscode from 'vscode';
import { SidebarProvider } from './ui/sidebarProvider';
import { OutlineExtractorRegistry } from './outline/registry';
import { Logger, LogLevel } from './core/logger';
import { generateWorkspace, generateFolder, generateSelected } from './commands/workspaceCommand';
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

  // Initialize outline extractor registry
  OutlineExtractorRegistry.initialize();

  // Register sidebar provider
  const sidebarProvider = new SidebarProvider(context.extensionUri);

  // Register webview view
  const sidebarViewRegistration = vscode.window.registerWebviewViewProvider(
    'aiContextSidebarView',
    sidebarProvider
  );

  // Register commands
  const workspaceCommand = vscode.commands.registerCommand(
    'aiContext.generateWorkspace',
    () => generateWorkspace(context)
  );

  const folderCommand = vscode.commands.registerCommand(
    'aiContext.generateFolder',
    () => generateFolder(context)
  );

  const selectedCommand = vscode.commands.registerCommand(
    'aiContext.generateSelected',
    () => generateSelected(context)
  );

  const configureCommand = vscode.commands.registerCommand(
    'aiContext.configure',
    () => configureSettings()
  );

  const openSidebarCommand = vscode.commands.registerCommand(
    'aiContext.openSidebar',
    () => vscode.commands.executeCommand('aiContextSidebarView.focus')
  );

  const openLogsCommand = vscode.commands.registerCommand(
    'aiContext.openLogs',
    () => Logger.show()
  );

  // Register all disposables
  context.subscriptions.push(
    sidebarViewRegistration,
    workspaceCommand,
    folderCommand,
    selectedCommand,
    configureCommand,
    openSidebarCommand,
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
