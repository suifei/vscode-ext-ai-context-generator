/**
 * Mocha test setup
 */

// Global test configuration
global.expect = require('chai').expect;

// Unhandled rejection handler
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});
