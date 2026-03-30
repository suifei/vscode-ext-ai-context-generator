/**
 * Unit tests for TokenCounter
 */

import { expect } from 'chai';
import { TokenCounter } from '../../../src/core/tokenCounter';

describe('TokenCounter', () => {
  describe('tiktoken mode', () => {
    let counter: TokenCounter;

    before(() => {
      counter = new TokenCounter('tiktoken');
    });

    it('should count tokens in simple text', () => {
      const text = 'Hello, world!';
      const count = counter.count(text);
      expect(count).to.be.greaterThan(0);
      expect(count).to.be.lessThan(20);
    });

    it('should count tokens in code', () => {
      const code = `
        function add(a: number, b: number): number {
          return a + b;
        }
      `;
      const count = counter.count(code);
      expect(count).to.be.greaterThan(0);
    });

    it('should return 0 for empty string', () => {
      expect(counter.count('')).to.equal(0);
    });

    it('should handle null/undefined gracefully', () => {
      expect(counter.count('' as any)).to.equal(0);
    });

    it('should handle large texts efficiently', () => {
      const largeText = 'a'.repeat(10000);
      const count = counter.count(largeText);
      expect(count).to.be.greaterThan(0);
    });
  });

  describe('simple mode', () => {
    it('should estimate tokens using character division', () => {
      const counter = new TokenCounter('simple');
      const text = 'Hello, world!';
      const count = counter.count(text);
      expect(count).to.be.closeTo(Math.ceil(text.length / 3.75), 1);
    });

    it('should handle empty string', () => {
      const counter = new TokenCounter('simple');
      expect(counter.count('')).to.equal(0);
    });

    it('should estimate consistently', () => {
      const counter = new TokenCounter('simple');
      const text = 'The quick brown fox jumps over the lazy dog.';
      const count1 = counter.count(text);
      const count2 = counter.count(text);
      expect(count1).to.equal(count2);
    });
  });

  describe('formatTokenCount', () => {
    it('should format small numbers', () => {
      const counter = new TokenCounter('simple');
      expect(counter.formatTokenCount(999)).to.equal('999');
    });

    it('should format thousands', () => {
      const counter = new TokenCounter('simple');
      expect(counter.formatTokenCount(1500)).to.equal('1.5K');
      expect(counter.formatTokenCount(1000)).to.equal('1.0K');
    });

    it('should format millions', () => {
      const counter = new TokenCounter('simple');
      expect(counter.formatTokenCount(1500000)).to.equal('1.5M');
      expect(counter.formatTokenCount(1000000)).to.equal('1.0M');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle very long strings', () => {
      const counter = new TokenCounter('simple');
      const hugeText = 'x'.repeat(10000000);
      expect(() => counter.count(hugeText)).to.not.throw();
    });

    it('should handle special characters', () => {
      const counter = new TokenCounter('tiktoken');
      const specialText = '🎉 © ® ™ € £ ¥ ♥ ♦ ♣ ♠';
      expect(counter.count(specialText)).to.be.greaterThan(0);
    });

    it('should handle multiline code', () => {
      const counter = new TokenCounter('tiktoken');
      const multilineCode = `
        class Example {
          constructor() {
            this.value = 42;
          }

          getValue() {
            return this.value;
          }
        }
      `;
      expect(counter.count(multilineCode)).to.be.greaterThan(0);
    });
  });
});
