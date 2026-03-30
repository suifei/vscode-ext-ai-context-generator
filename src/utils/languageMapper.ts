/**
 * Maps file extensions to programming languages for syntax highlighting
 */

export interface LanguageInfo {
  name: string;
  aliases: string[];
  extensions: string[];
}

const LANGUAGE_MAP: Record<string, LanguageInfo> = {
  javascript: {
    name: 'JavaScript',
    aliases: ['js', 'javascript'],
    extensions: ['.js', '.jsx', '.mjs', '.cjs'],
  },
  typescript: {
    name: 'TypeScript',
    aliases: ['ts', 'typescript'],
    extensions: ['.ts', '.tsx'],
  },
  python: {
    name: 'Python',
    aliases: ['py', 'python'],
    extensions: ['.py', '.pyw', '.pyi'],
  },
  go: {
    name: 'Go',
    aliases: ['go', 'golang'],
    extensions: ['.go'],
  },
  rust: {
    name: 'Rust',
    aliases: ['rs', 'rust'],
    extensions: ['.rs'],
  },
  java: {
    name: 'Java',
    aliases: ['java'],
    extensions: ['.java'],
  },
  c: {
    name: 'C',
    aliases: ['c'],
    extensions: ['.c', '.h'],
  },
  cpp: {
    name: 'C++',
    aliases: ['cpp', 'c++', 'cxx'],
    extensions: ['.cpp', '.hpp', '.cc', '.hh', '.cxx', '.hxx'],
  },
  csharp: {
    name: 'C#',
    aliases: ['cs', 'csharp'],
    extensions: ['.cs'],
  },
  php: {
    name: 'PHP',
    aliases: ['php'],
    extensions: ['.php', '.phtml'],
  },
  ruby: {
    name: 'Ruby',
    aliases: ['rb', 'ruby'],
    extensions: ['.rb'],
  },
  swift: {
    name: 'Swift',
    aliases: ['swift'],
    extensions: ['.swift'],
  },
  kotlin: {
    name: 'Kotlin',
    aliases: ['kt', 'kotlin'],
    extensions: ['.kt', '.kts'],
  },
  scala: {
    name: 'Scala',
    aliases: ['scala'],
    extensions: ['.scala'],
  },
  html: {
    name: 'HTML',
    aliases: ['html'],
    extensions: ['.html', '.htm'],
  },
  css: {
    name: 'CSS',
    aliases: ['css'],
    extensions: ['.css'],
  },
  scss: {
    name: 'SCSS',
    aliases: ['scss', 'sass'],
    extensions: ['.scss', '.sass'],
  },
  json: {
    name: 'JSON',
    aliases: ['json'],
    extensions: ['.json', '.jsonc'],
  },
  yaml: {
    name: 'YAML',
    aliases: ['yaml', 'yml'],
    extensions: ['.yaml', '.yml'],
  },
  xml: {
    name: 'XML',
    aliases: ['xml'],
    extensions: ['.xml'],
  },
  markdown: {
    name: 'Markdown',
    aliases: ['md', 'markdown'],
    extensions: ['.md', '.markdown'],
  },
  shell: {
    name: 'Shell',
    aliases: ['sh', 'bash', 'shell'],
    extensions: ['.sh', '.bash', '.zsh'],
  },
  sql: {
    name: 'SQL',
    aliases: ['sql'],
    extensions: ['.sql'],
  },
  dockerfile: {
    name: 'Dockerfile',
    aliases: ['dockerfile', 'docker'],
    extensions: ['.dockerfile', 'Dockerfile'],
  },
};

const EXTENSION_MAP: Record<string, string> = {};

// Build extension to language map
Object.entries(LANGUAGE_MAP).forEach(([langId, info]) => {
  info.extensions.forEach(ext => {
    EXTENSION_MAP[ext] = langId;
  });
  info.aliases.forEach(alias => {
    EXTENSION_MAP[alias] = langId;
  });
});

/**
 * Get language ID from file extension
 */
export function getLanguageFromExtension(extension: string): string | undefined {
  if (!extension.startsWith('.')) {
    extension = '.' + extension;
  }
  return EXTENSION_MAP[extension.toLowerCase()];
}

/**
 * Get language name from file path
 */
export function getLanguageFromPath(filePath: string): string | undefined {
  const ext = filePath.substring(filePath.lastIndexOf('.'));
  return getLanguageFromExtension(ext);
}
