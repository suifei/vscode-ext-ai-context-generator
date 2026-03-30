/**
 * Generate .aicontextignore configuration file
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { DEFAULT_CONFIG, IGNORE_FILE_NAME } from '../config/constants';

/**
 * Generate .aicontextignore file in workspace root
 */
export async function generateIgnoreFile(context: vscode.ExtensionContext): Promise<void> {
  // Get workspace root
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showWarningMessage('No workspace folder found. Please open a project first.');
    return;
  }

  const workspaceRoot = workspaceFolder.uri.fsPath;
  const filePath = path.join(workspaceRoot, IGNORE_FILE_NAME);
  const fileUri = vscode.Uri.file(filePath);

  // Check if file already exists
  let fileExists = false;
  try {
    await vscode.workspace.fs.stat(fileUri);
    fileExists = true;
  } catch {
    // File doesn't exist, proceed
  }

  // Confirm overwrite if file exists
  if (fileExists) {
    const confirm = await vscode.window.showWarningMessage(
      `${IGNORE_FILE_NAME} already exists. Do you want to overwrite it?`,
      { modal: true },
      'Overwrite',
      'Cancel'
    );
    if (confirm !== 'Overwrite') {
      return;
    }
  }

  // Get ignore patterns from config
  const config = vscode.workspace.getConfiguration('aiContext');
  const ignorePatterns = config.get<string[]>('ignorePatterns', DEFAULT_CONFIG.ignorePatterns);

  // Build file content
  const content = getIgnoreFileContent(ignorePatterns);

  // Write file
  try {
    await vscode.workspace.fs.writeFile(
      fileUri,
      new TextEncoder().encode(content)
    );

    // Show success message
    const message = fileExists
      ? `${IGNORE_FILE_NAME} has been updated successfully.`
      : `${IGNORE_FILE_NAME} has been created successfully.`;

    vscode.window.showInformationMessage(message, 'Open File').then(selected => {
      if (selected === 'Open File') {
        vscode.commands.executeCommand('vscode.openWith', fileUri, 'default');
      }
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create ${IGNORE_FILE_NAME}: ${error}`);
  }
}

/**
 * Build .aicontextignore file content
 */
function getIgnoreFileContent(patterns: string[]): string {
  const lines = [
    '# AI Context Generator Ignore Patterns',
    '# Syntax follows .gitignore rules',
    '# This file works together with the global aiContext.ignorePatterns setting',
    '#',
    '# You can add project-specific patterns below.',
    '# Lines starting with # are comments.',
    '#',
    '',
    ...patterns.filter(p => p.trim()).sort()
  ];
  return lines.join('\n');
}
