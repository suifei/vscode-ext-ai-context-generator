/**
 * Toggle large file degradation setting
 */

import * as vscode from 'vscode';

/**
 * Toggle the enableLargeFileDegradation setting
 */
export async function toggleLargeFileDegradation(): Promise<void> {
  const config = vscode.workspace.getConfiguration('aiContext');
  const currentValue = config.get<boolean>('enableLargeFileDegradation', true);

  // Toggle the value
  const newValue = !currentValue;
  await config.update('enableLargeFileDegradation', newValue, vscode.ConfigurationTarget.Global);

  // Show notification
  const message = newValue
    ? 'Large file degradation enabled. Files exceeding maxFileSize can use outline/summary mode.'
    : 'Large file degradation disabled. File size alone will not trigger outline/summary mode.';

  vscode.window.showInformationMessage(message);
}
