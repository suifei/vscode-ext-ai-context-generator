/**
 * QuickPick for output selection
 *
 * @deprecated This file is kept for command palette support but direct commands are preferred.
 * The extension provides three direct commands (clipboard, file, preview) for better UX.
 */

import * as vscode from 'vscode';
import { OutputTarget } from '../config/constants';

export interface OutputPickerOptions {
  defaultTarget?: OutputTarget;
  title?: string;
}

export class OutputPicker {
  /**
   * Show output target picker (used by command palette)
   */
  static async show(options: OutputPickerOptions = {}): Promise<OutputTarget | undefined> {
    const { defaultTarget = 'clipboard', title = 'Select output destination' } = options;

    const items = [
      {
        label: '$(clippy) Copy to Clipboard',
        description: defaultTarget === 'clipboard' ? '(default)' : '',
        value: 'clipboard' as OutputTarget,
      },
      {
        label: '$(file) Save to File',
        description: defaultTarget === 'file' ? '(default)' : '',
        value: 'file' as OutputTarget,
      },
      {
        label: '$(preview) Open in Preview',
        description: defaultTarget === 'preview' ? '(default)' : '',
        value: 'preview' as OutputTarget,
      },
    ];

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: title,
    });

    return selected?.value;
  }

  /**
   * Copy content to clipboard
   */
  static async copyToClipboard(content: string): Promise<void> {
    await vscode.env.clipboard.writeText(content);
  }

  /**
   * Show content in preview editor
   */
  static async showPreview(content: string): Promise<vscode.TextDocument> {
    const doc = await vscode.workspace.openTextDocument({
      content,
      language: 'markdown',
    });
    await vscode.window.showTextDocument(doc, { preview: true });
    return doc;
  }
}
