/**
 * Token counting with tiktoken (accurate) and simple fallback
 */

import * as tiktoken from 'js-tiktoken';
import { AIContextConfig } from '../config/constants';

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

  public countMultiple(texts: string[]): number {
    return texts.reduce((total, text) => total + this.count(text), 0);
  }

  public countFile(content: string, filePath: string = ''): number {
    const headerTokens = filePath ? this.count(`// File: ${filePath}\n\n`) : 0;
    return headerTokens + this.count(content);
  }

  public formatTokenCount(count: number): string {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  }

  public exceedsLimit(count: number, limit: number): boolean {
    return count > limit;
  }

  public getUsagePercentage(count: number, limit: number): number {
    return Math.min(100, Math.round((count / limit) * 100));
  }

  // No-op for API compatibility (shared cache is managed internally)
  public dispose(): void {
    // Nothing to dispose - encoding is cached globally
  }
}

export function createTokenCounter(config: AIContextConfig): TokenCounter {
  return new TokenCounter(config.tokenEstimation);
}
