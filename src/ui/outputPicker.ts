/**
 * QuickPick for output selection
 */

import * as vscode from 'vscode';
import { OutputTarget } from '../config/constants';

export interface OutputPickerOptions {
  defaultTarget?: OutputTarget;
  title?: string;
}

export class OutputPicker {
  /**
   * Show output target picker
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
   * Quick clipboard output
   */
  static async copyToClipboard(content: string): Promise<void> {
    await vscode.env.clipboard.writeText(content);
  }

  /**
   * Quick file output
   */
  static async saveToFile(content: string, defaultPath: string): Promise<vscode.Uri | undefined> {
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(defaultPath),
      filters: { Markdown: ['md'] },
    });

    if (uri) {
      const encoder = new TextEncoder();
      await vscode.workspace.fs.writeFile(uri, encoder.encode(content));
    }

    return uri;
  }

  /**
   * Quick preview output
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
