/**
 * Unit tests for errorUtils
 */

import { expect } from 'chai';
import { getErrorMessage } from '../../../src/utils/errorUtils';

describe('errorUtils', () => {
  describe('getErrorMessage', () => {
    it('should extract message from Error instance', () => {
      const error = new Error('Test error message');
      expect(getErrorMessage(error)).to.equal('Test error message');
    });

    it('should handle error with stack', () => {
      const error = new Error('Stack trace error');
      expect(getErrorMessage(error)).to.equal('Stack trace error');
    });

    it('should convert string to string', () => {
      expect(getErrorMessage('String error')).to.equal('String error');
    });

    it('should convert number to string', () => {
      expect(getErrorMessage(404)).to.equal('404');
    });

    it('should convert object to string', () => {
      expect(getErrorMessage({ code: 500, message: 'Server error' })).to.equal('[object Object]');
    });

    it('should handle null', () => {
      expect(getErrorMessage(null)).to.equal('null');
    });

    it('should handle undefined', () => {
      expect(getErrorMessage(undefined)).to.equal('undefined');
    });

    it('should handle boolean', () => {
      expect(getErrorMessage(true)).to.equal('true');
    });
  });
});
