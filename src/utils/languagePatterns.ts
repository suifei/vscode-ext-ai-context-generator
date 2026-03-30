/**
 * Shared language patterns for code analysis
 * Used by GenericAnalyzer and RegexFallback
 */

export interface LanguagePatterns {
  type: RegExp[];
  function: RegExp[];
  import: RegExp[];
}

const PATTERNS: Record<string, LanguagePatterns> = {
  typescript: {
    type: [/^(?:export\s+)?(?:interface|type|class|enum)\s+\w+/],
    function: [
      /^(?:async\s+)?function\s+\w+/,
      /^(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|\w+)\s*=>/,
      /^\w+\s*\([^)]*\)\s*[:{]/,
    ],
    import: [/^import\s+.*from\s+['"`].+['"`]/, /^require\s*\(['"`].+['"`]\)/],
  },
  javascript: {
    type: [/^(?:export\s+)?(?:class|interface)\s+\w+/],
    function: [
      /^(?:async\s+)?function\s+\w+/,
      /^(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|\w+)\s*=>/,
    ],
    import: [/^import\s+.*from\s+['"`].+['"`]/, /^require\s*\(['"`].+['"`]\)/],
  },
  python: {
    type: [/^class\s+\w+/],
    function: [/^(?:async\s+)?def\s+\w+\s*\(/],
    import: [/^import\s+\w+/, /^from\s+.+\s+import/],
  },
  go: {
    type: [/^type\s+\w+\s+(?:struct|interface)/],
    function: [/^func\s+\(?\w*\)?\s*\w+/],
    import: [/^import\s+\(?\)?/],
  },
  rust: {
    type: [/^(?:pub\s+)?(?:struct|enum|trait)\s+\w+/],
    function: [/^(?:pub\s+)?(?:async\s+)?(?:unsafe\s+)?fn\s+\w+/],
    import: [/^use\s+.+;/],
  },
  java: {
    type: [/^(?:public\s+)?(?:class|interface|enum)\s+\w+/],
    function: [/^(?:public\s+)?(?:static\s+)?\w+\s+\w+\s*\([^)]*\)/],
    import: [/^import\s+.+;/],
  },
  cpp: {
    type: [/^(?:class|struct)\s+\w+/],
    function: [/\w+\s*\([^)]*\)\s*{/, /^\w+(?:\s*\*)+\s+\w+\s*\([^)]*\)\s*;/],
    import: [/^#include\s+<.+>/, /^#include\s+".+">/],
  },
};

const FALLBACK_PATTERNS: LanguagePatterns = {
  type: [/^(?:class|interface|struct|type|enum)\s+\w+/],
  function: [/^(?:function|def|func|fn)\s+\w+/],
  import: [/^(?:import|use|from)\s+/],
};

/**
 * Get patterns for a language, with fallback to generic patterns
 */
export function getPatterns(languageId: string): LanguagePatterns {
  const lang = languageId.toLowerCase();
  return PATTERNS[lang] ?? FALLBACK_PATTERNS;
}

/**
 * Get all supported language IDs
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(PATTERNS);
}
