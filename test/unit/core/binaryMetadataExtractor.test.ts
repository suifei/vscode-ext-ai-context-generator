/**
 * Unit tests for BinaryMetadataExtractor
 */

import { expect } from 'chai';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { BinaryMetadataExtractor } from '../../../src/core/binaryMetadataExtractor';

describe('BinaryMetadataExtractor', () => {
  let tempDir: string;
  let extractor: BinaryMetadataExtractor;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-context-meta-test-'));
    extractor = new BinaryMetadataExtractor(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('PNG metadata extraction', () => {
    it('should extract PNG dimensions', () => {
      // Create a minimal valid PNG (1x1 red pixel)
      const pngData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk start
        0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00, 0x64, // 100x100
        0x08, 0x02, 0x00, 0x00, 0x00,
      ]);
      const pngPath = path.join(tempDir, 'test.png');
      fs.writeFileSync(pngPath, pngData);

      const metadata = extractor.extract(pngPath);

      expect(metadata.type).to.equal('image');
      expect(metadata.format).to.equal('PNG');
      expect(metadata.dimensions).to.equal('100x100');
      expect(metadata.colorDepth).to.equal('8-bit');
    });

    it('should detect alpha channel in PNG', () => {
      const pngData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, // Color type 6 = RGBA
      ]);
      const pngPath = path.join(tempDir, 'alpha.png');
      fs.writeFileSync(pngPath, pngData);

      const metadata = extractor.extract(pngPath);
      expect(metadata.hasAlpha).to.be.true;
    });
  });

  describe('JPEG metadata extraction', () => {
    it('should extract JPEG dimensions', () => {
      // Create a minimal JPEG with SOF0 marker (need more padding for loop to find it)
      const jpegData = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
        0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
        0x00, 0x01, 0x00, 0x00, 0xFF, 0xC0, 0x00, 0x11,
        0x08, 0x01, 0xE0, 0x02, 0xB0, // SOF0: precision=8, height=480, width=688
        0x00, 0x00, 0x00, 0x00, 0x00, // Padding to ensure loop finds SOF0
      ]);
      const jpegPath = path.join(tempDir, 'test.jpg');
      fs.writeFileSync(jpegPath, jpegData);

      const metadata = extractor.extract(jpegPath);

      expect(metadata.type).to.equal('image');
      expect(metadata.format).to.equal('JPG');
      expect(metadata.dimensions).to.equal('688x480');
      expect(metadata.colorDepth).to.equal('8-bit');
    });

    it('should report no alpha for JPEG', () => {
      // Put SOF0 at the beginning to ensure it's found
      const jpegData = Buffer.from([
        0xFF, 0xD8, // JPEG signature
        0xFF, 0xC0, 0x00, 0x11, // SOF0 marker + length
        0x08, 0x00, 0x10, 0x00, 0x10, // precision=8, height=4096, width=4096
        0x00, 0x00, 0x00, 0x00, 0x00, // Padding
      ]);
      const jpegPath = path.join(tempDir, 'no-alpha.jpg');
      fs.writeFileSync(jpegPath, jpegData);

      const metadata = extractor.extract(jpegPath);
      expect(metadata.hasAlpha).to.be.false;
    });
  });

  describe('GIF metadata extraction', () => {
    it('should extract GIF dimensions', () => {
      const gifData = Buffer.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // 'GIF89a'
        0x40, 0x01, 0xF0, 0x00, // 320x240
        0x00, 0x00, 0x00, 0x00,
      ]);
      const gifPath = path.join(tempDir, 'test.gif');
      fs.writeFileSync(gifPath, gifData);

      const metadata = extractor.extract(gifPath);

      expect(metadata.type).to.equal('image');
      expect(metadata.format).to.equal('GIF');
      expect(metadata.dimensions).to.equal('320x240');
    });
  });

  describe('BMP metadata extraction', () => {
    it('should extract BMP dimensions', () => {
      const bmpData = Buffer.alloc(30);
      bmpData.write('BM', 0); // Signature
      bmpData.writeUInt32LE(54, 2); // File size
      bmpData.writeUInt32LE(0, 6); // Reserved
      bmpData.writeUInt32LE(54, 10); // Offset to pixel data
      bmpData.writeUInt32LE(40, 14); // Header size
      bmpData.writeUInt32LE(200, 18); // Width
      bmpData.writeInt32LE(-150, 22); // Height (negative = top-down)
      bmpData.writeUInt16LE(1, 26); // Planes
      bmpData.writeUInt16LE(24, 28); // Bits per pixel

      const bmpPath = path.join(tempDir, 'test.bmp');
      fs.writeFileSync(bmpPath, bmpData);

      const metadata = extractor.extract(bmpPath);

      expect(metadata.type).to.equal('image');
      expect(metadata.format).to.equal('BMP');
      expect(metadata.dimensions).to.equal('200x150');
      expect(metadata.colorDepth).to.equal('24-bit');
    });
  });

  describe('WAV metadata extraction', () => {
    it('should extract WAV metadata', () => {
      const wavData = Buffer.alloc(44);
      wavData.write('RIFF', 0);
      wavData.writeUInt32LE(100, 4);
      wavData.write('WAVE', 8);
      wavData.write('fmt ', 12);
      wavData.writeUInt32LE(16, 16); // fmt chunk size
      wavData.writeUInt16LE(1, 20); // Audio format (PCM)
      wavData.writeUInt16LE(2, 22); // Channels (stereo)
      wavData.writeUInt32LE(44100, 24); // Sample rate
      wavData.writeUInt32LE(176400, 28); // Byte rate
      wavData.writeUInt16LE(4, 32); // Block align
      wavData.writeUInt16LE(16, 34); // Bits per sample

      const wavPath = path.join(tempDir, 'test.wav');
      fs.writeFileSync(wavPath, wavData);

      const metadata = extractor.extract(wavPath);

      expect(metadata.type).to.equal('audio');
      expect(metadata.format).to.equal('WAV');
      expect(metadata.channels).to.equal(2);
      expect(metadata.sampleRate).to.equal('44.1kHz');
      expect(metadata.bitrate).to.equal('1411kbps');
      expect(metadata.colorDepth).to.equal('16-bit');
    });
  });

  describe('GZIP metadata extraction', () => {
    it('should extract GZIP metadata', () => {
      const gzData = Buffer.from([
        0x1F, 0x8B, // GZIP signature
        0x08, // Compression method (DEFLATE)
        0x00, // Flags
        0x00, 0x00, 0x00, 0x00, // Mtime
        0x00, // Extra flags
        0x03, // OS (Unix)
      ]);
      const gzPath = path.join(tempDir, 'test.gz');
      fs.writeFileSync(gzPath, gzData);

      const metadata = extractor.extract(gzPath);

      expect(metadata.type).to.equal('archive');
      expect(metadata.format).to.equal('GZ');
      expect(metadata.compression).to.equal('DEFLATE');
    });
  });

  describe('TTF metadata extraction', () => {
    it('should extract TTF table count', () => {
      const ttfData = Buffer.alloc(12);
      ttfData.writeUInt32BE(0x00010000, 0); // SFNT version
      ttfData.writeUInt16BE(5, 4); // Number of tables
      ttfData.writeUInt16BE(0x80, 6); // Search range
      ttfData.writeUInt16BE(3, 8); // Entry selector
      ttfData.writeUInt16BE(0x50, 10); // Range shift

      const ttfPath = path.join(tempDir, 'test.ttf');
      fs.writeFileSync(ttfPath, ttfData);

      const metadata = extractor.extract(ttfPath);

      expect(metadata.type).to.equal('font');
      expect(metadata.format).to.equal('TTF');
      expect(metadata.entryCount).to.equal(5);
    });
  });

  describe('base metadata', () => {
    it('should include file size', () => {
      const testPath = path.join(tempDir, 'test.png');
      fs.writeFileSync(testPath, Buffer.from([0x89, 0x50]));

      const metadata = extractor.extract(testPath);

      expect(metadata.fileSize).to.equal(2);
    });

    it('should detect MIME types', () => {
      const pngPath = path.join(tempDir, 'test.png');
      fs.writeFileSync(pngPath, Buffer.from([0x89, 0x50]));

      const pngMeta = extractor.extract(pngPath);
      expect(pngMeta.mime).to.equal('image/png');

      const mp3Path = path.join(tempDir, 'test.mp3');
      fs.writeFileSync(mp3Path, Buffer.from([0xFF, 0xFB]));

      const mp3Meta = extractor.extract(mp3Path);
      expect(mp3Meta.mime).to.equal('audio/mpeg');
    });

    it('should handle unknown file types', () => {
      const unknownPath = path.join(tempDir, 'unknown.xyz');
      fs.writeFileSync(unknownPath, Buffer.from('data'));

      const metadata = extractor.extract(unknownPath);

      expect(metadata.type).to.equal('binary');
      expect(metadata.format).to.equal('XYZ');
    });
  });

  describe('error handling', () => {
    it('should handle invalid file data gracefully', () => {
      const invalidPath = path.join(tempDir, 'invalid.png');
      fs.writeFileSync(invalidPath, Buffer.from('not a real png'));

      const metadata = extractor.extract(invalidPath);

      // Should still return base metadata
      expect(metadata.type).to.equal('image');
      expect(metadata.format).to.equal('PNG');
      expect(metadata.description).to.exist;
    });

    it('should handle empty files', () => {
      const emptyPath = path.join(tempDir, 'empty.jpg');
      fs.writeFileSync(emptyPath, Buffer.alloc(0));

      const metadata = extractor.extract(emptyPath);

      expect(metadata.fileSize).to.equal(0);
    });
  });
});
