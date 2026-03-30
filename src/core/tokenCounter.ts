/**
 * Token counting with tiktoken (accurate) and simple fallback
 */

import * as tiktoken from 'js-tiktoken';

// Shared encoding instance (singleton for memory efficiency)
let cachedEncoding: tiktoken.Tiktoken | null = null;
let encodingLoadFailed = false;

function getCachedEncoding(): tiktoken.Tiktoken | null {
  if (cachedEncoding) {
    return cachedEncoding;
  }
  if (encodingLoadFailed) {
    return null;
  }

  try {
    cachedEncoding = tiktoken.getEncoding('cl100k_base');
    return cachedEncoding;
  } catch {
    encodingLoadFailed = true;
    return null;
  }
}

export class TokenCounter {
  private encoding: tiktoken.Tiktoken | null;
  private mode: 'tiktoken' | 'simple';

  constructor(mode: 'tiktoken' | 'simple' = 'tiktoken') {
    this.mode = mode;
    this.encoding = mode === 'tiktoken' ? getCachedEncoding() : null;

    if (mode === 'tiktoken' && !this.encoding) {
      this.mode = 'simple';
    }
  }

  public count(text: string): number {
    if (!text) return 0;

    if (this.mode === 'tiktoken' && this.encoding) {
      try {
        return this.encoding.encode(text).length;
      } catch {
        // Fall back to simple counting
      }
    }
    return Math.ceil(text.length / 3.75);
  }

  public formatTokenCount(count: number): string {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  }
}
