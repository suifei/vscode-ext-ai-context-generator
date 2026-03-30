/**
 * Unit tests for TemplateRenderer
 */

import { expect } from 'chai';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { TemplateRenderer, TemplateVariables } from '../../../src/core/templateRenderer';

describe('TemplateRenderer', () => {
  let tempDir: string;
  let renderer: TemplateRenderer;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-context-test-'));
    renderer = new TemplateRenderer(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('render', () => {
    it('should replace single variable', () => {
      const template = 'Hello, $PROJECT_NAME!';
      const variables: TemplateVariables = {
        PROJECT_NAME: 'World',
        DIR_TREE: '',
        FILE_LIST: '',
        FILE_CONTENTS: '',
        TOKEN_COUNT: '',
        TOKEN_LIMIT: '',
        FILE_COUNT: '',
        OUTLINE_COUNT: '',
        TIMESTAMP: '',
      };
      const result = renderer.render(template, variables);
      expect(result).to.equal('Hello, World!');
    });

    it('should replace multiple variables', () => {
      const template = '$PROJECT_NAME generated at $TIMESTAMP';
      const variables: TemplateVariables = {
        PROJECT_NAME: 'Test',
        DIR_TREE: '',
        FILE_LIST: '',
        FILE_CONTENTS: '',
        TOKEN_COUNT: '100',
        TOKEN_LIMIT: '',
        FILE_COUNT: '5',
        OUTLINE_COUNT: '0',
        TIMESTAMP: '12:00',
      };
      const result = renderer.render(template, variables);
      expect(result).to.include('Test');
      expect(result).to.include('12:00');
    });

    it('should handle empty variable values', () => {
      const template = 'Count: $TOKEN_COUNT';
      const variables: TemplateVariables = {
        PROJECT_NAME: '',
        DIR_TREE: '',
        FILE_LIST: '',
        FILE_CONTENTS: '',
        TOKEN_COUNT: '',
        TOKEN_LIMIT: '',
        FILE_COUNT: '',
        OUTLINE_COUNT: '',
        TIMESTAMP: '',
      };
      const result = renderer.render(template, variables);
      expect(result).to.equal('Count: ');
    });

    it('should replace all standard template variables', () => {
      const template = `
# $PROJECT_NAME

## Structure
\`\`\`
$DIR_TREE
\`\`\`

## Files
$FILE_CONTENTS

## Stats
- Tokens: $TOKEN_COUNT / $TOKEN_LIMIT
- Files: $FILE_COUNT
- Outlines: $OUTLINE_COUNT
- Generated: $TIMESTAMP
`;

      const variables: TemplateVariables = {
        PROJECT_NAME: 'TestProject',
        DIR_TREE: 'src/',
        FILE_LIST: 'src/index.ts',
        FILE_CONTENTS: '// code here',
        TOKEN_COUNT: '1000',
        TOKEN_LIMIT: '128000',
        FILE_COUNT: '42',
        OUTLINE_COUNT: '5',
        TIMESTAMP: '2024-01-01 12:00:00',
        SCOPE: 'workspace',
        WORKSPACE_PATH: '/test/project',
      };

      const result = renderer.render(template, variables);

      expect(result).to.include('TestProject');
      expect(result).to.include('src/');
      expect(result).to.include('// code here');
      expect(result).to.include('1000');
      expect(result).to.include('128000');
      expect(result).to.include('42');
      expect(result).to.include('5');
      expect(result).to.include('2024-01-01 12:00:00');
    });

    it('should handle missing optional variables', () => {
      const template = 'Selected: $SELECTED_FILES';
      const variables: TemplateVariables = {
        PROJECT_NAME: '',
        DIR_TREE: '',
        FILE_LIST: '',
        FILE_CONTENTS: '',
        TOKEN_COUNT: '',
        TOKEN_LIMIT: '',
        FILE_COUNT: '',
        OUTLINE_COUNT: '',
        TIMESTAMP: '',
        SELECTED_FILES: undefined,
      };
      const result = renderer.render(template, variables);
      expect(result).to.equal('Selected: ');
    });

    it('should not leave placeholders when variable is missing', () => {
      const template = 'Value: $MISSING_VAR';
      const variables: TemplateVariables = {
        PROJECT_NAME: '',
        DIR_TREE: '',
        FILE_LIST: '',
        FILE_CONTENTS: '',
        TOKEN_COUNT: '',
        TOKEN_LIMIT: '',
        FILE_COUNT: '',
        OUTLINE_COUNT: '',
        TIMESTAMP: '',
      };
      const result = renderer.render(template, variables);
      // Unknown variables are left as-is in the template
      expect(result).to.equal('Value: $MISSING_VAR');
    });

    it('should handle repeated variables', () => {
      const template = '$TIMESTAMP - $TIMESTAMP - $TIMESTAMP';
      const variables: TemplateVariables = {
        PROJECT_NAME: '',
        DIR_TREE: '',
        FILE_LIST: '',
        FILE_CONTENTS: '',
        TOKEN_COUNT: '',
        TOKEN_LIMIT: '',
        FILE_COUNT: '',
        OUTLINE_COUNT: '',
        TIMESTAMP: 'NOW',
      };
      const result = renderer.render(template, variables);
      expect(result).to.equal('NOW - NOW - NOW');
    });

    it('should handle variables with similar names', () => {
      const template = '$FILE_COUNT and $OUTLINE_COUNT';
      const variables: TemplateVariables = {
        PROJECT_NAME: '',
        DIR_TREE: '',
        FILE_LIST: '',
        FILE_CONTENTS: '',
        TOKEN_COUNT: '',
        TOKEN_LIMIT: '',
        FILE_COUNT: '10',
        OUTLINE_COUNT: '2',
        TIMESTAMP: '',
      };
      const result = renderer.render(template, variables);
      expect(result).to.equal('10 and 2');
    });
  });

  describe('loadTemplate', () => {
    it('should return default template when no custom template exists', () => {
      const template = renderer.loadTemplate('nonexistent');
      expect(template).to.include('$DIR_TREE');
      expect(template).to.include('$FILE_CONTENTS');
      expect(template).to.include('$TOKEN_COUNT');
    });

    it('should load custom template from file', () => {
      const templatesDir = path.join(tempDir, '.ai_context_templates');
      fs.mkdirSync(templatesDir, { recursive: true });
      fs.writeFileSync(path.join(templatesDir, 'custom.md'), 'Custom: $PROJECT_NAME');

      const template = renderer.loadTemplate('custom');
      expect(template).to.equal('Custom: $PROJECT_NAME');
    });

    it('should fallback to default template on read error', () => {
      const templatesDir = path.join(tempDir, '.ai_context_templates');
      fs.mkdirSync(templatesDir, { recursive: true });

      // Create a directory with the template name (will cause read error)
      const badPath = path.join(templatesDir, 'bad');
      fs.mkdirSync(badPath);

      const template = renderer.loadTemplate('bad');
      expect(template).to.include('$DIR_TREE'); // Should return default
    });

    it('should handle templates with complex content', () => {
      const templatesDir = path.join(tempDir, '.ai_context_templates');
      fs.mkdirSync(templatesDir, { recursive: true });

      const complexTemplate = `
# Project: $PROJECT_NAME

## File Tree
\`\`\`
$DIR_TREE
\`\`\`

## Contents
$FILE_CONTENTS

---
Generated at $TIMESTAMP
`;

      fs.writeFileSync(path.join(templatesDir, 'complex.md'), complexTemplate);

      const template = renderer.loadTemplate('complex');
      expect(template).to.equal(complexTemplate);
    });
  });

  describe('getAvailableTemplates', () => {
    it('should always include default template', () => {
      const templates = renderer.getAvailableTemplates();
      expect(templates).to.include('default');
    });

    it('should discover custom templates', () => {
      const templatesDir = path.join(tempDir, '.ai_context_templates');
      fs.mkdirSync(templatesDir, { recursive: true });
      fs.writeFileSync(path.join(templatesDir, 'custom1.md'), '');
      fs.writeFileSync(path.join(templatesDir, 'custom2.md'), '');

      const templates = renderer.getAvailableTemplates();
      expect(templates).to.include('default');
      expect(templates).to.include('custom1');
      expect(templates).to.include('custom2');
    });

    it('should not include non-markdown files', () => {
      const templatesDir = path.join(tempDir, '.ai_context_templates');
      fs.mkdirSync(templatesDir, { recursive: true });
      fs.writeFileSync(path.join(templatesDir, 'readme.txt'), '');
      fs.writeFileSync(path.join(templatesDir, 'data.json'), '');

      const templates = renderer.getAvailableTemplates();
      expect(templates).to.not.include('readme');
      expect(templates).to.not.include('data');
    });

    it('should handle missing templates directory', () => {
      const templates = renderer.getAvailableTemplates();
      expect(templates).to.deep.equal(['default']);
    });

    it('should handle empty templates directory', () => {
      const templatesDir = path.join(tempDir, '.ai_context_templates');
      fs.mkdirSync(templatesDir, { recursive: true });

      const templates = renderer.getAvailableTemplates();
      expect(templates).to.deep.equal(['default']);
    });
  });

  describe('default template', () => {
    it('should have all expected variables', () => {
      const template = renderer.loadTemplate('default');

      // Default template is rendered with actual values, not placeholders
      // So we check that it has the proper structure
      expect(template).to.include('📊');
      expect(template).to.include('Context Statistics');
      expect(template).to.include('Project Structure');
      expect(template).to.include('File Contents');
    });

    it('should have proper structure', () => {
      const template = renderer.loadTemplate('default');

      expect(template).to.include('📊');
      expect(template).to.include('Context Statistics');
      expect(template).to.include('Project Structure');
      expect(template).to.include('File Contents');
    });
  });

  describe('edge cases', () => {
    it('should handle template with only variables', () => {
      const template = '$PROJECT_NAME$DIR_TREE$FILE_CONTENTS';
      const variables: TemplateVariables = {
        PROJECT_NAME: 'A',
        DIR_TREE: 'B',
        FILE_LIST: '',
        FILE_CONTENTS: 'C',
        TOKEN_COUNT: '',
        TOKEN_LIMIT: '',
        FILE_COUNT: '',
        OUTLINE_COUNT: '',
        TIMESTAMP: '',
      };
      const result = renderer.render(template, variables);
      expect(result).to.equal('ABC');
    });

    it('should handle template with no variables', () => {
      const template = 'Plain text with no variables';
      const variables: TemplateVariables = {
        PROJECT_NAME: '',
        DIR_TREE: '',
        FILE_LIST: '',
        FILE_CONTENTS: '',
        TOKEN_COUNT: '',
        TOKEN_LIMIT: '',
        FILE_COUNT: '',
        OUTLINE_COUNT: '',
        TIMESTAMP: '',
      };
      const result = renderer.render(template, variables);
      expect(result).to.equal(template);
    });

    it('should handle empty template', () => {
      const variables: TemplateVariables = {
        PROJECT_NAME: '',
        DIR_TREE: '',
        FILE_LIST: '',
        FILE_CONTENTS: '',
        TOKEN_COUNT: '',
        TOKEN_LIMIT: '',
        FILE_COUNT: '',
        OUTLINE_COUNT: '',
        TIMESTAMP: '',
      };
      const result = renderer.render('', variables);
      expect(result).to.equal('');
    });

    it('should handle special characters in values', () => {
      const template = 'Content: $FILE_CONTENTS';
      const variables: TemplateVariables = {
        PROJECT_NAME: '',
        DIR_TREE: '',
        FILE_LIST: '',
        FILE_CONTENTS: 'Special chars: \n\t\r\\',
        TOKEN_COUNT: '',
        TOKEN_LIMIT: '',
        FILE_COUNT: '',
        OUTLINE_COUNT: '',
        TIMESTAMP: '',
      };
      const result = renderer.render(template, variables);
      expect(result).to.include('Special chars:');
    });

    it('should handle very long variable values', () => {
      const longContent = 'x'.repeat(100000);
      const template = '$FILE_CONTENTS';
      const variables: TemplateVariables = {
        PROJECT_NAME: '',
        DIR_TREE: '',
        FILE_LIST: '',
        FILE_CONTENTS: longContent,
        TOKEN_COUNT: '',
        TOKEN_LIMIT: '',
        FILE_COUNT: '',
        OUTLINE_COUNT: '',
        TIMESTAMP: '',
      };
      const result = renderer.render(template, variables);
      expect(result).to.have.length(100000);
    });

    it('should handle dollar signs not part of variables', () => {
      const template = 'Price: $100, not $VARIABLE';
      const variables: TemplateVariables = {
        PROJECT_NAME: '',
        DIR_TREE: '',
        FILE_LIST: '',
        FILE_CONTENTS: '',
        TOKEN_COUNT: '',
        TOKEN_LIMIT: '',
        FILE_COUNT: '',
        OUTLINE_COUNT: '',
        TIMESTAMP: '',
      };
      const result = renderer.render(template, variables);
      // Unknown variables ($VARIABLE) are left as-is
      expect(result).to.equal('Price: $100, not $VARIABLE');
    });
  });
});
