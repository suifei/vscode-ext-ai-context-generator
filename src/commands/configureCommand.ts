/**
 * Configure AI Context Generator settings
 */

import * as vscode from 'vscode';

interface ConfigOption {
  label: string;
  description: string;
  value: string;
  configKey: string;
  successMessage: string;
  prompt: string;
  minimum: number;
}

export async function configureSettings(): Promise<void> {
  const options: ConfigOption[] = [
    {
      label: 'Maximum File Size',
      description: 'Set threshold for outline mode (default: 50KB)',
      value: 'maxFileSize',
      configKey: 'maxFileSize',
      successMessage: 'Maximum file size set to',
      prompt: 'Enter maximum file size in bytes',
      minimum: 1,
    },
    {
      label: 'Token Limit',
      description: 'Set warning threshold for tokens (default: 128K)',
      value: 'maxTokens',
      configKey: 'maxTokens',
      successMessage: 'Token limit set to',
      prompt: 'Enter token warning threshold',
      minimum: 1,
    },
  ];

  const quickPickItems = [
    ...options.map(opt => ({
      label: opt.label,
      description: opt.description,
      value: opt.value,
    })),
    { label: 'Open Settings', description: 'Open full VSCode settings', value: 'openSettings' },
  ];

  const selected = await vscode.window.showQuickPick(quickPickItems, {
    placeHolder: 'Select a setting to configure',
  });

  if (!selected) {
    return;
  }

  if (selected.value === 'openSettings') {
    await vscode.commands.executeCommand('workbench.action.openSettings', 'aiContext');
    return;
  }

  const option = options.find(opt => opt.value === selected.value);
  if (option) {
    await configureNumericSetting(option);
  }
}

async function configureNumericSetting(option: ConfigOption): Promise<void> {
  const config = vscode.workspace.getConfiguration('aiContext');
  const current = config.get<number>(option.configKey, 0);

  const value = await vscode.window.showInputBox({
    prompt: option.prompt,
    value: current.toString(),
    validateInput: input => {
      const num = parseInt(input);
      if (isNaN(num) || num < option.minimum) {
        return `Please enter a number greater than or equal to ${option.minimum}`;
      }
      return null;
    },
  });

  if (value !== undefined) {
    await config.update(option.configKey, parseInt(value), true);
    vscode.window.showInformationMessage(`${option.successMessage} ${value}`);
  }
}
