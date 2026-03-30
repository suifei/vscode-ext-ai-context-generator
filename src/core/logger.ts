/**
 * Logger for AI Context Generator
 * Outputs to VSCode Output Channel for debugging
 */

import * as vscode from 'vscode';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

class LoggerImpl {
  private outputChannel: vscode.OutputChannel | null = null;
  private currentLevel: LogLevel = LogLevel.INFO;

  initialize(): void {
    if (!this.outputChannel) {
      this.outputChannel = vscode.window.createOutputChannel('AI Context Generator');
      this.info('Logger initialized');
    }
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
    this.info(`Log level set to: ${LOG_LEVEL_NAMES[level]}`);
  }

  dispose(): void {
    if (this.outputChannel) {
      this.outputChannel.dispose();
      this.outputChannel = null;
    }
  }

  show(): void {
    if (this.outputChannel) {
      this.outputChannel.show(true);
    }
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (level < this.currentLevel) {
      return;
    }

    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const prefix = `[${timestamp}] [${LOG_LEVEL_NAMES[level]}]`;
    const formattedMessage = this.formatMessage(message, args);
    const fullMessage = `${prefix} ${formattedMessage}`;

    // Output to VSCode Output Channel
    if (this.outputChannel) {
      this.outputChannel.appendLine(fullMessage);
    }

    // Also log to console for development
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(fullMessage, ...args);
        break;
      case LogLevel.INFO:
        console.log(fullMessage, ...args);
        break;
      case LogLevel.WARN:
        console.warn(fullMessage, ...args);
        break;
      case LogLevel.ERROR:
        console.error(fullMessage, ...args);
        break;
    }
  }

  private formatMessage(message: string, args: unknown[]): string {
    if (args.length === 0) {
      return message;
    }

    const formattedArgs = args.map(arg => {
      if (typeof arg === 'string') {
        return arg;
      }
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}\n${arg.stack}`;
      }
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }).join(' ');

    return `${message} ${formattedArgs}`;
  }

  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  // Convenience methods for common operations
  logTokenCount(count: number, limit: number): void {
    const percentage = Math.round((count / limit) * 100);
    this.info(`Token count: ${count}/${limit} (${percentage}%)`);
  }

  logScanStart(scope: string): void {
    this.info(`Starting scan for scope: ${scope}`);
  }

  logScanComplete(fileCount: number, duration: number): void {
    this.info(`Scan complete: ${fileCount} files in ${duration}ms`);
  }

  logError(context: string, error: unknown): void {
    this.error(`Error in ${context}:`, error);
  }
}

// Global singleton instance
const logger = new LoggerImpl();

export { logger as Logger };
