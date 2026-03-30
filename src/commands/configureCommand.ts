/**
 * Configure AI Context Generator settings
 */

import * as vscode from 'vscode';

export async function configureSettings(): Promise<void> {
  const options = [
    { label: 'Maximum File Size', description: 'Set threshold for outline mode (default: 50KB)', value: 'maxFileSize' },
    { label: 'Token Limit', description: 'Set warning threshold for tokens (default: 128K)', value: 'maxTokens' },
    { label: 'Output Target', description: 'Set default output destination', value: 'outputTarget' },
    { label: 'Open Settings', description: 'Open full VSCode settings', value: 'openSettings' },
  ];

  const selected = await vscode.window.showQuickPick(options, {
    placeHolder: 'Select a setting to configure',
  });

  if (!selected) {
    return;
  }

  switch (selected.value) {
    case 'maxFileSize':
      await configureMaxFileSize();
      break;
    case 'maxTokens':
      await configureMaxTokens();
      break;
    case 'outputTarget':
      await configureOutputTarget();
      break;
    case 'openSettings':
      await vscode.commands.executeCommand('workbench.action.openSettings', 'aiContext');
      break;
  }
}

async function configureMaxFileSize(): Promise<void> {
  const config = vscode.workspace.getConfiguration('aiContext');
  const current = config.get<number>('maxFileSize', 51200);

  const value = await vscode.window.showInputBox({
    prompt: 'Enter maximum file size in bytes',
    value: current.toString(),
    validateInput: input => {
      const num = parseInt(input);
      if (isNaN(num) || num < 0) {
        return 'Please enter a valid number';
      }
      return null;
    },
  });

  if (value !== undefined) {
    await config.update('maxFileSize', parseInt(value), true);
    vscode.window.showInformationMessage(`Maximum file size set to ${value} bytes`);
  }
}

async function configureMaxTokens(): Promise<void> {
  const config = vscode.workspace.getConfiguration('aiContext');
  const current = config.get<number>('maxTokens', 128000);

  const value = await vscode.window.showInputBox({
    prompt: 'Enter token warning threshold',
    value: current.toString(),
    validateInput: input => {
      const num = parseInt(input);
      if (isNaN(num) || num < 0) {
        return 'Please enter a valid number';
      }
      return null;
    },
  });

  if (value !== undefined) {
    await config.update('maxTokens', parseInt(value), true);
    vscode.window.showInformationMessage(`Token limit set to ${value}`);
  }
}

async function configureOutputTarget(): Promise<void> {
  const config = vscode.workspace.getConfiguration('aiContext');
  const current = config.get<'clipboard' | 'file' | 'preview'>('defaultOutputTarget', 'clipboard');

  const options = [
    { label: '$(clippy) Clipboard', value: 'clipboard' },
    { label: '$(file) File', value: 'file' },
    { label: '$(preview) Preview', value: 'preview' },
  ];

  const selected = await vscode.window.showQuickPick(options, {
    placeHolder: `Current: ${current}`,
  });

  if (selected) {
    await config.update('defaultOutputTarget', selected.value, true);
    vscode.window.showInformationMessage(`Output target set to ${selected.value}`);
  }
}
