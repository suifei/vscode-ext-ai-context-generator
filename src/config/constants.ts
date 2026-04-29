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
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  // Outline extraction settings
  outlineDetail: OutlineDetail;
  outlineIncludePrivate: boolean;
  outlineExtractComments: boolean;
  outlineMaxItems: number;
  // Large file degradation setting
  enableLargeFileDegradation: boolean;
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
  logLevel: 'info',
  // Outline extraction defaults
  outlineDetail: 'standard',
  outlineIncludePrivate: false,
  outlineExtractComments: true,
  outlineMaxItems: 50,
  // Large file degradation default
  enableLargeFileDegradation: true,
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

/**
 * Shared formatting constants
 */

/** Section separator for formatted output */
export const SECTION_SEPARATOR = '// ═══════════════════════════════════════';

/** Outline section titles */
export const SECTION_TITLES = {
  TYPES: 'TYPES',
  TYPES_WITH_COUNT: (count: number) => `TYPES & INTERFACES (${count})`,
  FUNCTIONS: 'FUNCTIONS',
  FUNCTIONS_WITH_COUNT: (count: number) => `FUNCTIONS & METHODS (${count})`,
  IMPORTS: 'IMPORTS/DEPENDENCIES',
  IMPORTS_WITH_COUNT: (count: number) => `IMPORTS/DEPENDENCIES (${count})`,
} as const;

/**
 * Format utilities
 */

/** Truncate text to maximum length */
export function truncateText(text: string, maxLength: number): string {
  return text.substring(0, maxLength);
}

/** Extract code signature from line (removes comments and trailing brace) */
export function extractCodeSignature(line: string): string {
  // Remove leading comments
  line = line.replace(/^\/\/\s*/, '');
  // Extract up to opening brace or end
  const match = line.match(/^([^{]*?)(?:\s*\{)?$/);
  return match ? match[1].trim() : line.substring(0, 80);
}

/** Format a section header with separator */
export function formatSectionHeader(title: string): string {
  return `${SECTION_SEPARATOR}\n// ${title}\n${SECTION_SEPARATOR}`;
}
