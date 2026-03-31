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
    ? 'Large file degradation enabled. Files exceeding maxFileSize will use outline/summary mode.'
    : 'Large file degradation disabled. All files will be read in full (may use more tokens).';

  vscode.window.showInformationMessage(message);
}
