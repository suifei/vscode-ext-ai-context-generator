/**
 * Template renderer with $VARIABLE placeholder substitution
 */

import * as fs from 'fs';
import * as path from 'path';
import { TEMPLATES_DIR, DEFAULT_TEMPLATE_NAME } from '../config/constants';

export interface TemplateVariables {
  PROJECT_NAME: string;
  DIR_TREE: string;
  FILE_LIST: string;
  FILE_CONTENTS: string;
  TOKEN_COUNT: string;
  TOKEN_LIMIT: string;
  FILE_COUNT: string;
  OUTLINE_COUNT: string;
  TIMESTAMP: string;
  SELECTED_FILES?: string;
  SCOPE?: string;
  WORKSPACE_PATH?: string;
}

export class TemplateRenderer {
  constructor(private readonly workspaceRoot: string) {}

  /**
   * Render a template with variables
   */
  render(template: string, variables: TemplateVariables): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `$${key}`;
      result = result.split(placeholder).join(value || '');
    }

    return result;
  }

  /**
   * Load a template by name
   */
  loadTemplate(templateName: string): string {
    const customPath = path.join(this.workspaceRoot, TEMPLATES_DIR, `${templateName}.md`);

    if (fs.existsSync(customPath)) {
      try {
        return fs.readFileSync(customPath, 'utf-8');
      } catch (error: unknown) {
        console.warn(`Failed to read template: ${error}`);
      }
    }

    return this.getDefaultTemplate();
  }

  /**
   * Get available template names
   */
  getAvailableTemplates(): string[] {
    const templates = [DEFAULT_TEMPLATE_NAME];
    const templatesDir = path.join(this.workspaceRoot, TEMPLATES_DIR);

    if (fs.existsSync(templatesDir)) {
      try {
        const files = fs.readdirSync(templatesDir);
        for (const file of files) {
          if (file.endsWith('.md')) {
            const name = file.slice(0, -3);
            if (name !== DEFAULT_TEMPLATE_NAME) {
              templates.push(name);
            }
          }
        }
      } catch (error: unknown) {
        console.warn(`Failed to read templates: ${error}`);
      }
    }

    return templates;
  }

  private getDefaultTemplate(): string {
    return `> 📊 **Context Statistics**
> - Total Tokens: ~$TOKEN_COUNT / $TOKEN_LIMIT
> - Files Included: $FILE_COUNT ($OUTLINE_COUNT as outline)
> - Generated at: $TIMESTAMP

# Project Structure

\`\`\`
$DIR_TREE
\`\`\`

# File Contents

$FILE_CONTENTS`;
  }
}
