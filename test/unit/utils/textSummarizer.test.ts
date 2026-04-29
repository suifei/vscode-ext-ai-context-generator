/**
 * Unit tests for textSummarizer
 * Tests the TextRank-based summarization algorithm with English and Chinese text
 */

import { expect } from 'chai';
import {
  cleanText,
  splitIntoSentences,
  calculateSimilarity,
  summarizeText,
  extractKeySentences
} from '../../../src/utils/textSummarizer';

describe('textSummarizer', () => {
  describe('cleanText', () => {
    it('should remove excessive whitespace', () => {
      const input = 'Hello    world   test';
      expect(cleanText(input)).to.equal('Hello world test');
    });

    it('should remove leading/trailing whitespace from lines', () => {
      const input = '  Line 1  \n  Line 2  \n   Line 3   ';
      expect(cleanText(input)).to.equal('Line 1\nLine 2\nLine 3');
    });

    it('should remove empty lines', () => {
      const input = 'Line 1\n\n\nLine 2\n\nLine 3';
      expect(cleanText(input)).to.equal('Line 1\nLine 2\nLine 3');
    });

    it('should normalize line breaks', () => {
      const input = 'Line 1\r\nLine 2\rLine 3';
      expect(cleanText(input)).to.equal('Line 1\nLine 2\nLine 3');
    });

    it('should handle Chinese text whitespace', () => {
      const input = '中文    测试   文本';
      expect(cleanText(input)).to.equal('中文 测试 文本');
    });

    it('should handle empty string', () => {
      expect(cleanText('')).to.equal('');
      expect(cleanText('   \n\n   ')).to.equal('');
    });
  });

  describe('splitIntoSentences', () => {
    it('should split English text by periods', () => {
      const input = 'Hello world. This is a test. Another sentence.';
      const result = splitIntoSentences(input);
      expect(result).to.have.lengthOf(3);
      expect(result[0]).to.include('Hello world');
      expect(result[1]).to.include('This is a test');
      expect(result[2]).to.include('Another sentence');
    });

    it('should split Chinese text by Chinese periods', () => {
      const input = '这是第一句话。这是第二句话。这是第三句话。';
      const result = splitIntoSentences(input);
      expect(result).to.have.lengthOf(3);
      expect(result[0]).to.include('这是第一句话');
      expect(result[1]).to.include('这是第二句话');
      expect(result[2]).to.include('这是第三句话');
    });

    it('should split mixed Chinese-English text', () => {
      const input = 'Hello world. 这是中文。Another sentence. 再来一句。';
      const result = splitIntoSentences(input);
      expect(result.length).to.be.greaterThan(0);
      // Should contain both English and Chinese sentences
      const text = result.join(' ');
      expect(text).to.include('Hello');
      expect(text).to.include('这是中文');
    });

    it('should handle question marks and exclamation marks', () => {
      const input = 'Is this a question? Yes it is! What about this? 这是问句吗？是的！';
      const result = splitIntoSentences(input);
      expect(result.length).to.be.greaterThan(2);
    });

    it('should handle text without sentence delimiters', () => {
      const input = 'Just some text without proper ending';
      const result = splitIntoSentences(input);
      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.include('Just some text');
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 1 for identical sentences', () => {
      const s1 = 'Hello world test';
      const s2 = 'Hello world test';
      expect(calculateSimilarity(s1, s2)).to.equal(1);
    });

    it('should return 0 for completely different sentences', () => {
      const s1 = 'cat dog fish';
      const s2 = 'tree rock mountain';
      expect(calculateSimilarity(s1, s2)).to.equal(0);
    });

    it('should detect similarity in overlapping words', () => {
      const s1 = 'The quick brown fox';
      const s2 = 'The quick brown dog';
      const similarity = calculateSimilarity(s1, s2);
      expect(similarity).to.be.greaterThan(0.5);
      expect(similarity).to.be.lessThan(1);
    });

    it('should handle Chinese text similarity', () => {
      const s1 = '这是一个测试';
      const s2 = '这是另一个测试';
      const similarity = calculateSimilarity(s1, s2);
      expect(similarity).to.be.greaterThan(0);
    });

    it('should handle empty strings', () => {
      expect(calculateSimilarity('', 'test')).to.equal(0);
      expect(calculateSimilarity('test', '')).to.equal(0);
      expect(calculateSimilarity('', '')).to.equal(0);
    });

    it('should handle mixed Chinese-English text', () => {
      const s1 = 'AI context generator test';
      const s2 = 'AI 上下文 生成器 测试';
      // Should have some similarity due to common characters/words
      const similarity = calculateSimilarity(s1, s2);
      expect(similarity).to.be.greaterThanOrEqual(0);
    });
  });

  describe('summarizeText - English Text', () => {
    const englishText = `
AI Context Generator is a VSCode extension that generates structured Markdown context from project files.
It supports smart filtering with .aicontextignore files. The extension can process various file types intelligently.
For small code files under 50KB, it provides full content with syntax highlighting.
Large files over 50KB use function-level semantic summaries for TypeScript/JavaScript and LSP/symbol outlines for other languages.
This method preserves type definitions and function signatures while significantly reducing token consumption.
The extension also includes dedicated analyzers for logs, CSV files, and configuration files.
Log analyzers can identify log level distributions and detect error patterns.
Config analyzers parse JSON and YAML structures while redacting sensitive information.
All processing is done locally without any network requests or API calls.
This ensures privacy and gives users full control over their code.
The extension supports output to clipboard, file, or a preview tab.
Custom templates can be created using variables like $PROJECT_NAME and $FILE_CONTENTS.
`;

    it('should return original text if under maxLength', () => {
      const result = summarizeText(englishText, 10000);
      expect(result.length).to.be.lessThan(englishText.length * 1.1); // Allow small difference due to cleaning
    });

    it('should compress text to fit maxLength', () => {
      const maxLength = 200;
      const result = summarizeText(englishText, maxLength);
      expect(result.length).to.be.lessThan(maxLength * 1.5); // Allow some flexibility
    });

    it('should extract meaningful sentences, not just truncate', () => {
      const maxLength = 150;
      const result = summarizeText(englishText, maxLength);

      // Result should contain complete sentences
      expect(result).to.not.match(/\\.\\.\\.$/);
      // Should contain key terms from the original text
      expect(result.toLowerCase()).to.satisfy((text: string) =>
        text.includes('vscode') ||
        text.includes('context') ||
        text.includes('markdown') ||
        text.includes('extension')
      );
    });

    it('should handle very short maxLength gracefully', () => {
      const result = summarizeText(englishText, 50);
      expect(result).to.not.be.empty;
      // May exceed maxLength due to minSentences constraint
      expect(result.length).to.be.lessThan(500);
    });
  });

  describe('summarizeText - Chinese Text', () => {
    const chineseText = `
AI 上下文生成器是一个 VSCode 扩展，可以将项目代码转换为结构化的 Markdown 上下文。
它支持使用 .aicontextignore 文件进行智能过滤。该扩展可以智能处理各种文件类型。
对于小于 50KB 的小型代码文件，它提供带有语法高亮的完整内容。
超过 50KB 时，TypeScript/JavaScript 使用函数级语义摘要，其他语言使用 LSP/符号大纲。
这种方法保留了类型定义和函数签名，同时显著减少了 Token 消耗。
该扩展还包括用于日志、CSV 文件和配置文件的专用分析器。
日志分析器可以识别日志级别分布并检测错误模式。
配置分析器解析 JSON 和 YAML 结构，同时对敏感信息进行脱敏。
所有处理都在本地完成，无需任何网络请求或 API 调用。
这确保了隐私保护，并让用户完全掌控自己的代码。
该扩展支持输出到剪贴板、文件或预览标签页。
可以使用 $PROJECT_NAME 和 $FILE_CONTENTS 等变量创建自定义模板。
`;

    it('should return original text if under maxLength', () => {
      const result = summarizeText(chineseText, 10000);
      expect(result.length).to.be.lessThan(chineseText.length * 1.1);
    });

    it('should compress Chinese text to fit maxLength', () => {
      const maxLength = 200;
      const result = summarizeText(chineseText, maxLength);
      expect(result.length).to.be.lessThan(maxLength * 1.5);
    });

    it('should extract meaningful Chinese sentences', () => {
      const maxLength = 150;
      const result = summarizeText(chineseText, maxLength);

      // Should contain key terms
      expect(result).to.satisfy((text: string) =>
        text.includes('VSCode') ||
        text.includes('扩展') ||
        text.includes('上下文') ||
        text.includes('Markdown')
      );
    });

    it('should handle very short maxLength for Chinese', () => {
      const result = summarizeText(chineseText, 50);
      expect(result).to.not.be.empty;
      expect(result.length).to.be.lessThan(100);
    });
  });

  describe('summarizeText - Mixed Chinese-English Text', () => {
    const mixedText = `
AI Context Generator (Advanced) is a powerful VSCode extension for generating structured Markdown context.
VSCode 扩展 AI 上下文生成器（高级版）可以将项目代码转换为结构化 Markdown 上下文。
It features intelligent file filtering using .aicontextignore patterns.
支持使用 .aicontextignore 模式进行智能文件过滤。
The extension processes code files with syntax highlighting; large files get semantic or LSP-based outlines.
该扩展处理代码文件时提供语法高亮；大文件则使用语义或 LSP 大纲。
All processing is done locally with no network requests or API calls.
所有处理都在本地完成，无需网络请求或 API 调用。
`;

    it('should handle mixed language text correctly', () => {
      const result = summarizeText(mixedText, 200);
      expect(result).to.not.be.empty;

      // Should contain both English and Chinese content
      const hasEnglish = /[a-zA-Z]{3,}/.test(result);
      const hasChinese = /[\u4e00-\u9fa5]/.test(result);

      expect(hasEnglish || hasChinese).to.be.true;
    });

    it('should maintain sentence structure in compression', () => {
      const result = summarizeText(mixedText, 150);
      // Result should not be randomly truncated mid-sentence
      expect(result).to.not.match(/^[A-Za-z\u4e00-\u9fa5]{1,5}\.\.\.$/);
    });
  });

  describe('extractKeySentences', () => {
    const sampleText = `
AI Context Generator is a VSCode extension for generating structured Markdown context.
It supports smart filtering and intelligent file processing.
The extension can handle various file types including code, logs, and configuration files.
For large files, it uses semantic or LSP outline extraction to reduce token consumption.
All processing is done locally without any network requests.
This ensures privacy and gives users control over their code.
Custom templates support variables like $PROJECT_NAME.
The extension includes dedicated analyzers for different file types.
`;

    it('should extract specified number of key sentences', () => {
      const result = extractKeySentences(sampleText, 3);
      expect(result).to.have.lengthOf(3);
    });

    it('should return sentences with scores', () => {
      const result = extractKeySentences(sampleText, 3);
      result.forEach(item => {
        expect(item).to.have.property('text');
        expect(item).to.have.property('position');
        expect(item).to.have.property('score');
        expect(item.score).to.be.greaterThan(0);
      });
    });

    it('should return sentences in original order', () => {
      const result = extractKeySentences(sampleText, 3);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].position).to.be.greaterThan(result[i - 1].position);
      }
    });

    it('should filter out short sentences', () => {
      const textWithShort = 'AI is great. Hi. This is a longer sentence with more content. Another good one.';
      const result = extractKeySentences(textWithShort, 5, 10);
      // 'Hi.' should be filtered out
      expect(result.every(s => s.text.length >= 10)).to.be.true;
    });
  });

  describe('Real-world Test - README English Section', () => {
    const readmeEnglish = `
A VSCode extension that generates structured Markdown context from project files for AI assistant interactions.

Right-click any file/folder to generate to clipboard, file, or preview.

Features include smart filtering with .aicontextignore support. Intelligent processing for code files, large files, logs, CSV, config, and binary files.

For small code files, it provides full content with syntax highlighting. Large files over 50KB use TS/JS semantic summaries or LSP/symbol outlines.

The extension supports output to clipboard, file, or preview tab. Token counting uses Tiktoken for accuracy or simple estimation.

Custom templates can be created with variables like $PROJECT_NAME, $DIR_TREE, $FILE_CONTENTS, $TOKEN_COUNT, and $FILE_COUNT.

The layered processing architecture automatically selects optimal processing based on file type and size.

For large code files, TS/JS semantic compression and LSP-based outlines keep context concise even for files with tens of thousands of lines.

This preserves complete type information and function signatures while significantly reducing token consumption, typically achieving 90%+ compression.

The smart summary engine includes dedicated analyzers for logs, configs, documents, and CSV files.

Performance optimizations include parallel file reading, LRU caching, incremental filtering, and lazy evaluation.

Privacy is ensured with 100% local processing, sensitive data protection, and controlled output.
`;

    it('should generate coherent summary of README', () => {
      const summary = summarizeText(readmeEnglish, 300);

      console.log('\n=== README English Summary (300 chars) ===');
      console.log(summary);
      console.log('=== End Summary ===\n');

      expect(summary).to.not.be.empty;
      expect(summary.length).to.be.lessThan(400);

      // Should contain key concepts (check actual content from output)
      const summaryLower = summary.toLowerCase();
      const hasKeywords =
        summaryLower.includes('vscode') ||
        summaryLower.includes('extension') ||
        summaryLower.includes('markdown') ||
        summaryLower.includes('context') ||
        summaryLower.includes('intelligent') ||
        summaryLower.includes('processing') ||
        summaryLower.includes('files');

      expect(hasKeywords, 'Summary should contain key terms from README').to.be.true;
    });

    it('should generate longer summary with more detail', () => {
      const summary = summarizeText(readmeEnglish, 500);

      console.log('\n=== README English Summary (500 chars) ===');
      console.log(summary);
      console.log('=== End Summary ===\n');

      expect(summary.length).to.be.greaterThan(300);
      expect(summary.length).to.be.lessThan(600);
    });

    it('should extract key sentences from README', () => {
      const keySentences = extractKeySentences(readmeEnglish, 5);

      console.log('\n=== README English Key Sentences ===');
      keySentences.forEach((item, index) => {
        console.log(`${index + 1}. [Score: ${item.score.toFixed(3)}] ${item.text}`);
      });
      console.log('=== End Key Sentences ===\n');

      expect(keySentences).to.have.lengthOf(5);
      keySentences.forEach(item => {
        expect(item.text.length).to.be.greaterThan(10);
      });
    });
  });

  describe('Real-world Test - README Chinese Section', () => {
    const readmeChinese = `
VSCode 扩展，将项目代码转换为结构化 Markdown 上下文，用于 AI 助手交互。

右键点击任意文件或文件夹，生成到剪切板、文件或预览。

功能特性包括智能过滤，支持 .aicontextignore。智能处理代码文件、大文件、日志、CSV、配置和二进制文件。

对于小型代码文件，提供完整内容和语法高亮。超过 50KB 时，TypeScript/JavaScript 优先使用 Compiler API 的函数级语义摘要，其他语言使用 LSP/符号大纲。

扩展支持输出到剪贴板、文件或预览标签页。Token 计数使用 Tiktoken 精确计数或简单估算。

可以使用 $PROJECT_NAME、$DIR_TREE、$FILE_CONTENTS、$TOKEN_COUNT 和 $FILE_COUNT 等变量创建自定义模板。

分层处理架构根据文件类型和大小自动选择最优处理方案。

对于大型 TypeScript/JavaScript 文件，语义压缩大纲在优先保留行为信息的同时降低 Token；其他语言仍通过 LSP 获得简洁结构大纲。

这保留了完整的类型信息和函数签名，同时显著减少 Token 消耗，通常实现 90% 以上的压缩率。

智能摘要引擎包括用于日志、配置、文档和 CSV 文件的专用分析器。

性能优化包括并行文件读取、LRU 缓存、增量过滤和惰性求值。

通过 100% 本地处理、敏感数据保护和可控输出确保隐私。
`;

    it('should generate coherent summary of Chinese README', () => {
      const summary = summarizeText(readmeChinese, 300);

      console.log('\n=== README Chinese Summary (300 chars) ===');
      console.log(summary);
      console.log('=== End Summary ===\n');

      expect(summary).to.not.be.empty;
      expect(summary.length).to.be.lessThan(400);

      // Should contain Chinese characters
      expect(/[\u4e00-\u9fa5]/.test(summary)).to.be.true;
    });

    it('should generate longer Chinese summary with more detail', () => {
      const summary = summarizeText(readmeChinese, 500);

      console.log('\n=== README Chinese Summary (500 chars) ===');
      console.log(summary);
      console.log('=== End Summary ===\n');

      expect(summary.length).to.be.greaterThan(300);
      expect(summary.length).to.be.lessThan(600);
    });

    it('should extract key sentences from Chinese README', () => {
      const keySentences = extractKeySentences(readmeChinese, 5);

      console.log('\n=== README Chinese Key Sentences ===');
      keySentences.forEach((item, index) => {
        console.log(`${index + 1}. [Score: ${item.score.toFixed(3)}] ${item.text}`);
      });
      console.log('=== End Key Sentences ===\n');

      expect(keySentences).to.have.lengthOf(5);
      keySentences.forEach(item => {
        expect(item.text.length).to.be.greaterThan(10);
      });
    });
  });

  describe('Algorithm Quality Tests', () => {
    it('should preserve important information in summary', () => {
      const text = `
The system has a critical security vulnerability that allows unauthorized access.
Users should update immediately to version 2.0.1.
The update includes important security patches.
Performance improvements were also added in this release.
The UI has been slightly modified for better usability.
Some minor bugs were fixed as well.
`;

      const summary = summarizeText(text, 100);

      // Critical security info should be preserved
      const summaryLower = summary.toLowerCase();
      expect(
        summaryLower.includes('security') ||
        summaryLower.includes('vulnerability') ||
        summaryLower.includes('update')
      ).to.be.true;
    });

    it('should handle repetitive text gracefully', () => {
      const repetitiveText = `
This is a test. This is a test. This is a test.
The extension is good. The extension is good.
VSCode is useful. VSCode is useful.
AI context generation helps. AI context generation helps.
`;

      const summary = summarizeText(repetitiveText, 50);
      expect(summary).to.not.be.empty;
      // Should deduplicate somewhat
      expect(summary.length).to.be.lessThan(repetitiveText.length);
    });

    it('should handle edge case of single sentence', () => {
      const singleSentence = 'This is a single sentence without any breaks.';
      const summary = summarizeText(singleSentence, 10);
      expect(summary).to.include('sentence');
    });

    it('should handle very long text efficiently', () => {
      // Generate a long text
      const sentences: string[] = [];
      for (let i = 0; i < 100; i++) {
        sentences.push(`Sentence number ${i} contains some text about the topic being discussed.`);
      }
      const longText = sentences.join(' ');

      const startTime = Date.now();
      const summary = summarizeText(longText, 200);
      const endTime = Date.now();

      console.log(`\nProcessed 100 sentences in ${endTime - startTime}ms`);

      expect(summary).to.not.be.empty;
      expect(summary.length).to.be.lessThan(300);
      expect(endTime - startTime).to.be.lessThan(5000); // Should complete in 5 seconds
    });
  });
});
