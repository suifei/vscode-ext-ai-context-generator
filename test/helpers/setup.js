/**
 * Mocha test setup
 */

// Mock vscode module BEFORE any other imports
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === 'vscode') {
    return require('../mocks/vscode');
  }
  return originalRequire.apply(this, arguments);
};

// Global test configuration
global.expect = require('chai').expect;

// Unhandled rejection handler
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});
