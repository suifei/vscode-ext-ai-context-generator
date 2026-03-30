/**
 * AI Context Generator - VSCode Extension
 * Entry point - registers commands and event handlers
 */

import * as vscode from 'vscode';
import { SidebarProvider } from './ui/sidebarProvider';
import { OutlineExtractorRegistry } from './outline/registry';
import { generateWorkspace, generateFolder, generateSelected } from './commands/workspaceCommand';
import { configureSettings } from './commands/configureCommand';

export function activate(context: vscode.ExtensionContext): void {
  console.log('AI Context Generator is now active');

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

  // Register all disposables
  context.subscriptions.push(
    sidebarViewRegistration,
    workspaceCommand,
    folderCommand,
    selectedCommand,
    configureCommand,
    openSidebarCommand
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
  console.log('AI Context Generator deactivated');
}
