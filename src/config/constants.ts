/**
 * Default configuration constants for AI Context Generator
 */

export type OutlineDetail = 'basic' | 'standard' | 'detailed';

export interface AIContextConfig {
  maxFileSize: number;
  maxTokens: number;
  textPreviewLength: number;
  logSampleLines: number;
  csvSampleRows: number;
  defaultTemplate: string;
  sensitiveKeyPatterns: string[];
  autoDetectLanguage: boolean;
  ignorePatterns: string[];
  binaryFilePatterns: string[];
  outputFileName: string;
  showTreeEmoji: boolean;
  tokenEstimation: 'tiktoken' | 'simple';
  parallelFileReads: number;
  // Outline extraction settings
  outlineDetail: OutlineDetail;
  outlineIncludePrivate: boolean;
  outlineExtractComments: boolean;
  outlineMaxItems: number;
}

export const DEFAULT_CONFIG: AIContextConfig = {
  maxFileSize: 51200,
  maxTokens: 128000,
  textPreviewLength: 300,
  logSampleLines: 5,
  csvSampleRows: 3,
  defaultTemplate: 'default',
  sensitiveKeyPatterns: ['password', 'passwd', 'secret', 'token', 'api_key', 'apikey', 'private_key', 'credential'],
  autoDetectLanguage: true,
  ignorePatterns: ['node_modules/**', 'build/**', '.git/**', 'coverage/**', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'],
  binaryFilePatterns: ['*.png', '*.jpg', '*.jpeg', '*.gif', '*.webp', '*.ico', '*.bmp', '*.svg', '*.mp3', '*.mp4', '*.wav', '*.avi', '*.mov', '*.zip', '*.tar', '*.gz', '*.exe', '*.dll', '*.so', '*.dylib', '*.woff', '*.woff2', '*.ttf', '*.eot', '*.bin', '*.dat'],
  outputFileName: 'ai-context.md',
  showTreeEmoji: true,
  tokenEstimation: 'tiktoken',
  parallelFileReads: 50,
  // Outline extraction defaults
  outlineDetail: 'standard',
  outlineIncludePrivate: false,
  outlineExtractComments: true,
  outlineMaxItems: 50,
};

export const IGNORE_FILE_NAME = '.aicontextignore';
export const TEMPLATES_DIR = '.ai_context_templates';
export const DEFAULT_TEMPLATE_NAME = 'default';

export const TREE_CHARS = {
  vertical: '│',
  horizontal: '─',
  branch: '├',
  corner: '└',
} as const;

export const FILE_EMOJI = '📄';
export const FOLDER_EMOJI = '📁';
export const WARNING_EMOJI = '⚠️';
export const BINARY_EMOJI = '🖼️';

export type OutputTarget = 'clipboard' | 'file' | 'preview';
export type Scope = 'workspace' | 'folder' | 'selected';
