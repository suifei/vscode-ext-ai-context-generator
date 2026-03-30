/**
 * Token counting with tiktoken (accurate) and simple fallback
 */

import * as tiktoken from 'js-tiktoken';
import { AIContextConfig } from '../config/constants';

export class TokenCounter {
  private encoding: tiktoken.Tiktoken | null;
  private mode: 'tiktoken' | 'simple';

  constructor(mode: 'tiktoken' | 'simple' = 'tiktoken') {
    this.mode = mode;
    this.encoding = null;

    if (mode === 'tiktoken') {
      try {
        // Use cl100k_base encoding (GPT-4, GPT-3.5-turbo, etc.)
        this.encoding = tiktoken.getEncoding('cl100k_base');
      } catch (error) {
        // Fall back to simple mode if tiktoken fails
        this.mode = 'simple';
        this.encoding = null;
      }
    }
  }

  /**
   * Count tokens in a string using the configured method
   */
  public count(text: string): number {
    if (!text) {
      return 0;
    }

    if (this.mode === 'tiktoken' && this.encoding) {
      try {
        const tokens = this.encoding.encode(text);
        return tokens.length;
      } catch (error) {
        // Fall back to simple counting on error
        return this.simpleCount(text);
      }
    }

    return this.simpleCount(text);
  }

  /**
   * Simple token estimation (characters / 3.5)
   * This is a rough approximation for English text
   */
  private simpleCount(text: string): number {
    // Use a more accurate approximation:
    // - For code: ~4 chars per token
    // - For text: ~3.5 chars per token
    // We'll use 3.75 as a middle ground
    return Math.ceil(text.length / 3.75);
  }

  /**
   * Count tokens in multiple texts
   */
  public countMultiple(texts: string[]): number {
    return texts.reduce((total, text) => total + this.count(text), 0);
  }

  /**
   * Estimate tokens without encoding (for large texts where tiktoken might be slow)
   */
  public estimate(text: string): number {
    return this.simpleCount(text);
  }

  /**
   * Count tokens for a file based on its content
   */
  public countFile(content: string, filePath: string = ''): number {
    // Add some overhead for file path headers
    const headerTokens = filePath ? this.count(`// File: ${filePath}\n\n`) : 0;
    return headerTokens + this.count(content);
  }

  /**
   * Format token count for display
   */
  public formatTokenCount(count: number): string {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }

  /**
   * Check if token count exceeds a limit
   */
  public exceedsLimit(count: number, limit: number): boolean {
    return count > limit;
  }

  /**
   * Calculate percentage of token limit used
   */
  public getUsagePercentage(count: number, limit: number): number {
    return Math.min(100, Math.round((count / limit) * 100));
  }

  /**
   * Clean up encoding instance
   */
  public dispose(): void {
    this.encoding = null;
  }
}

/**
 * Create a token counter from configuration
 */
export function createTokenCounter(config: AIContextConfig): TokenCounter {
  return new TokenCounter(config.tokenEstimation);
}
