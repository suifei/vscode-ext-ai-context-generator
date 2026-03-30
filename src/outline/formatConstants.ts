/**
 * Shared formatting constants for outline generation
 */

export const OUTLINE_SEPARATOR = '// ═══════════════════════════════════════';

export const SECTION_TITLES = {
  TYPES: 'TYPES',
  TYPES_WITH_COUNT: (count: number) => `TYPES & INTERFACES (${count})`,
  FUNCTIONS: 'FUNCTIONS',
  FUNCTIONS_WITH_COUNT: (count: number) => `FUNCTIONS & METHODS (${count})`,
  IMPORTS: 'IMPORTS/DEPENDENCIES',
  IMPORTS_WITH_COUNT: (count: number) => `IMPORTS/DEPENDENCIES (${count})`,
} as const;

/**
 * Format a section header with separator
 */
export function formatSectionHeader(title: string): string {
  return `${OUTLINE_SEPARATOR}\n// ${title}\n${OUTLINE_SEPARATOR}`;
}

/**
 * Truncate text to maximum length
 */
export function truncateText(text: string, maxLength: number): string {
  return text.substring(0, maxLength);
}

/**
 * Extract code signature from line (removes comments and trailing brace)
 */
export function extractCodeSignature(line: string): string {
  // Remove leading comments
  line = line.replace(/^\/\/\s*/, '');

  // Extract up to opening brace or end
  const match = line.match(/^([^{]*?)(?:\s*\{)?$/);
  return match ? match[1].trim() : line.substring(0, 80);
}

/**
 * Get line information for display
 */
export function formatLineInfo(line: number, withLineNum: boolean): string {
  return withLineNum ? ` [L${line + 1}]` : ` → Line ${line + 1}`;
}
