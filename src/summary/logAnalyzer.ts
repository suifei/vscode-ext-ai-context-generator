/**
 * Log file analyzer: level distribution, error patterns, sampling
 */

import { FileReadResult } from '../core/fileReader';
import { AIContextConfig, WARNING_EMOJI, SECTION_SEPARATOR } from '../config/constants';
import { getRelativePath } from '../utils/fileUtils';

export class LogAnalyzer {
  private static readonly LOG_LEVELS = ['DEBUG', 'INFO', 'WARN', 'WARNING', 'ERROR', 'FATAL', 'CRITICAL', 'TRACE'] as const;

  constructor(
    private config: AIContextConfig,
    private workspaceRoot: string
  ) {}

  summarize(fileResult: FileReadResult): string {
    const relativePath = getRelativePath(this.workspaceRoot, fileResult.path);
    const lines = fileResult.content.split('\n');

    const levelPattern = /\b(DEBUG|INFO|WARN|WARNING|ERROR|FATAL|CRITICAL|TRACE)\b/i;
    const levels = new Map<string, number>();

    const errorPatterns = [/error/i, /exception/i, /failed/i, /timeout/i, /crash/i, /fatal/i];
    const errorLines: string[] = [];

    const samplesByLevel = this.initSamplesMap();
    const maxSamples = this.config.logSampleLines;

    for (const line of lines) {
      const levelMatch = line.match(levelPattern);
      if (levelMatch) {
        const level = levelMatch[1].toUpperCase();
        levels.set(level, (levels.get(level) || 0) + 1);

        if (samplesByLevel[level]?.length < maxSamples) {
          samplesByLevel[level]?.push(line.trim());
        }
      }

      if (errorLines.length < 10) {
        for (const pattern of errorPatterns) {
          if (pattern.test(line)) {
            errorLines.push(line.trim());
            break;
          }
        }
      }
    }

    return this.buildOutput(relativePath, lines, levels, errorLines, samplesByLevel, maxSamples);
  }

  private initSamplesMap(): Record<string, string[]> {
    return Object.fromEntries(LogAnalyzer.LOG_LEVELS.map(level => [level, []]));
  }

  private buildOutput(
    relativePath: string,
    lines: string[],
    levels: Map<string, number>,
    errorLines: string[],
    samplesByLevel: Record<string, string[]>,
    maxSamples: number
  ): string {
    let output = `// File: ${relativePath} (${WARNING_EMOJI} Log summary)\n`;
    output += `// Total lines: ${lines.length}\n\n`;

    // Log level distribution
    output += `${SECTION_SEPARATOR}\n`;
    output += `// LOG LEVEL DISTRIBUTION\n`;
    output += `${SECTION_SEPARATOR}\n`;

    if (levels.size > 0) {
      const sortedLevels = Array.from(levels.entries()).sort((a, b) => b[1] - a[1]);
      for (const [level, count] of sortedLevels) {
        const percentage = ((count / lines.length) * 100).toFixed(1);
        output += `// ${level.padEnd(8)}: ${count.toString().padStart(6)} (${percentage}%)\n`;
      }
    } else {
      output += `// (no standard log levels detected)\n`;
    }

    output += '\n';

    // Error patterns
    if (errorLines.length > 0) {
      output += `${SECTION_SEPARATOR}\n`;
      output += `// RECENT ERROR PATTERNS (first ${errorLines.length})\n`;
      output += `${SECTION_SEPARATOR}\n`;
      for (const line of errorLines) {
        output += `// ${line.substring(0, 150)}\n`;
      }
      output += '\n';
    }

    // Sample lines by level
    output += `${SECTION_SEPARATOR}\n`;
    output += `// SAMPLE LOG ENTRIES (up to ${maxSamples} per level)\n`;
    output += `${SECTION_SEPARATOR}\n`;

    for (const [level, samples] of Object.entries(samplesByLevel)) {
      if (samples.length > 0) {
        output += `\n// [${level}]\n`;
        for (const sample of samples) {
          output += `// ${sample}\n`;
        }
      }
    }

    return output;
  }
}
