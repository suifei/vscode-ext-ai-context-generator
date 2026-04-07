/**
 * Binary metadata extractor using pure Buffer operations
 * No external dependencies required
 */

import * as fs from 'fs';
import * as path from 'path';
import { BinaryMetadata } from './fileReader';

export class BinaryMetadataExtractor {
  private readonly workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Extract enhanced metadata from a binary file
   */
  extract(filePath: string): BinaryMetadata {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath);

    // 基础元数据
    const baseMeta = this.getBaseMetadata(filePath, ext, basename);

    try {
      // 根据文件类型提取增强元数据
      switch (ext) {
        case '.png':
          return { ...baseMeta, ...this.extractPngMetadata(filePath) };
        case '.jpg':
        case '.jpeg':
          return { ...baseMeta, ...this.extractJpegMetadata(filePath) };
        case '.gif':
          return { ...baseMeta, ...this.extractGifMetadata(filePath) };
        case '.bmp':
          return { ...baseMeta, ...this.extractBmpMetadata(filePath) };
        case '.webp':
          return { ...baseMeta, ...this.extractWebpMetadata(filePath) };
        case '.mp3':
          return { ...baseMeta, ...this.extractMp3Metadata(filePath) };
        case '.wav':
          return { ...baseMeta, ...this.extractWavMetadata(filePath) };
        case '.zip':
          return { ...baseMeta, ...this.extractZipMetadata(filePath) };
        case '.gz':
          return { ...baseMeta, ...this.extractGzMetadata(filePath) };
        case '.ttf':
          return { ...baseMeta, ...this.extractTtfMetadata(filePath) };
        default:
          return baseMeta;
      }
    } catch {
      return baseMeta;
    }
  }

  /**
   * Get base metadata for any file
   */
  private getBaseMetadata(filePath: string, ext: string, basename: string): Omit<BinaryMetadata, 'description'> & { description: string } {
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    const types: Record<string, { type: string; mime: string }> = {
      '.png': { type: 'image', mime: 'image/png' },
      '.jpg': { type: 'image', mime: 'image/jpeg' },
      '.jpeg': { type: 'image', mime: 'image/jpeg' },
      '.gif': { type: 'image', mime: 'image/gif' },
      '.webp': { type: 'image', mime: 'image/webp' },
      '.bmp': { type: 'image', mime: 'image/bmp' },
      '.ico': { type: 'image', mime: 'image/x-icon' },
      '.svg': { type: 'image', mime: 'image/svg+xml' },
      '.mp3': { type: 'audio', mime: 'audio/mpeg' },
      '.wav': { type: 'audio', mime: 'audio/wav' },
      '.ogg': { type: 'audio', mime: 'audio/ogg' },
      '.flac': { type: 'audio', mime: 'audio/flac' },
      '.aac': { type: 'audio', mime: 'audio/aac' },
      '.mp4': { type: 'video', mime: 'video/mp4' },
      '.avi': { type: 'video', mime: 'video/x-msvideo' },
      '.mov': { type: 'video', mime: 'video/quicktime' },
      '.mkv': { type: 'video', mime: 'video/x-matroska' },
      '.webm': { type: 'video', mime: 'video/webm' },
      '.zip': { type: 'archive', mime: 'application/zip' },
      '.tar': { type: 'archive', mime: 'application/x-tar' },
      '.gz': { type: 'archive', mime: 'application/gzip' },
      '.rar': { type: 'archive', mime: 'application/x-rar-compressed' },
      '.7z': { type: 'archive', mime: 'application/x-7z-compressed' },
      '.ttf': { type: 'font', mime: 'font/ttf' },
      '.otf': { type: 'font', mime: 'font/otf' },
      '.woff': { type: 'font', mime: 'font/woff' },
      '.woff2': { type: 'font', mime: 'font/woff2' },
      '.eot': { type: 'font', mime: 'application/vnd.ms-fontobject' },
    };

    const info = types[ext] || { type: 'binary', mime: undefined };

    return {
      type: info.type,
      format: ext.substring(1).toUpperCase(),
      description: `image file: ${basename}`.replace('image', info.type),
      fileSize,
      mime: info.mime,
    };
  }

  /**
   * Extract PNG metadata
   * PNG signature: 89 50 4E 47 0D 0A 1A 0A
   * IHDR chunk starts at byte 8, contains width (4 bytes) and height (4 bytes)
   */
  private extractPngMetadata(filePath: string): Partial<BinaryMetadata> {
    const buffer = Buffer.alloc(29);
    const fd = fs.openSync(filePath, 'r');
    try {
      fs.readSync(fd, buffer, 0, 29, 0);
    } finally {
      fs.closeSync(fd);
    }

    // Verify PNG signature
    if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4E || buffer[3] !== 0x47) {
      return {};
    }

    // IHDR chunk: width at bytes 16-19, height at bytes 20-23
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);

    // Bit depth at byte 24, color type at byte 25
    const bitDepth = buffer[24];
    const colorType = buffer[25];

    const colorDepth = `${bitDepth}-bit`;
    let hasAlpha = false;

    // Color type: 0=grayscale, 2=RGB, 3=palette, 4=grayscale+alpha, 6=RGB+alpha
    if (colorType === 4 || colorType === 6) {
      hasAlpha = true;
    }

    return {
      dimensions: `${width}x${height}`,
      colorDepth,
      hasAlpha,
    };
  }

  /**
   * Extract JPEG metadata
   * JPEG: SOF0 marker (FF C0) contains dimensions
   */
  private extractJpegMetadata(filePath: string): Partial<BinaryMetadata> {
    const buffer = Buffer.alloc(65536);
    const fd = fs.openSync(filePath, 'r');
    let bytesRead: number;
    try {
      bytesRead = fs.readSync(fd, buffer, 0, 65536, 0);
    } finally {
      fs.closeSync(fd);
    }

    // Find SOF0 marker (0xFF 0xC0) or SOF2 (progressive, 0xFF 0xC2)
    for (let i = 0; i < bytesRead - 10; i++) {
      if (buffer[i] === 0xFF && (buffer[i + 1] === 0xC0 || buffer[i + 1] === 0xC2)) {
        // Height at i+5,6 (2 bytes), width at i+7,8 (2 bytes)
        const height = buffer.readUInt16BE(i + 5);
        const width = buffer.readUInt16BE(i + 7);
        // Precision at i+4 (1 byte, usually 8)
        const precision = buffer[i + 4];

        return {
          dimensions: `${width}x${height}`,
          colorDepth: `${precision}-bit`,
          hasAlpha: false, // JPEG doesn't support alpha
        };
      }
    }

    return {};
  }

  /**
   * Extract GIF metadata
   */
  private extractGifMetadata(filePath: string): Partial<BinaryMetadata> {
    const buffer = Buffer.alloc(10);
    const fd = fs.openSync(filePath, 'r');
    try {
      fs.readSync(fd, buffer, 0, 10, 0);
    } finally {
      fs.closeSync(fd);
    }

    // Check GIF signature
    const sig = buffer.toString('ascii', 0, 3);
    if (sig !== 'GIF') {
      return {};
    }

    // Logical screen width at bytes 6-7, height at 8-9
    const width = buffer.readUInt16LE(6);
    const height = buffer.readUInt16LE(8);

    // Packed field at byte 5 contains global color table flag
    const packed = buffer[5];
    const hasGlobalColorTable = (packed & 0x80) !== 0;
    const colorDepth = ((packed & 0x07) + 1) * 3; // bits per color

    return {
      dimensions: `${width}x${height}`,
      colorDepth: hasGlobalColorTable ? `${colorDepth}-bit` : '8-bit',
      hasAlpha: false,
    };
  }

  /**
   * Extract BMP metadata
   */
  private extractBmpMetadata(filePath: string): Partial<BinaryMetadata> {
    const buffer = Buffer.alloc(30);
    const fd = fs.openSync(filePath, 'r');
    try {
      fs.readSync(fd, buffer, 0, 30, 0);
    } finally {
      fs.closeSync(fd);
    }

    // Check BMP signature ('BM')
    if (buffer[0] !== 0x42 || buffer[1] !== 0x4D) {
      return {};
    }

    // Width at bytes 18-21, height at 22-25 (little-endian)
    const width = buffer.readUInt32LE(18);
    const height = buffer.readInt32LE(22);
    // Bits per pixel at bytes 28-29
    const bitsPerPixel = buffer.readUInt16LE(28);

    return {
      dimensions: `${width}x${Math.abs(height)}`,
      colorDepth: `${bitsPerPixel}-bit`,
      hasAlpha: bitsPerPixel === 32,
    };
  }

  /**
   * Extract WebP metadata
   */
  private extractWebpMetadata(filePath: string): Partial<BinaryMetadata> {
    const buffer = Buffer.alloc(30);
    const fd = fs.openSync(filePath, 'r');
    try {
      fs.readSync(fd, buffer, 0, 30, 0);
    } finally {
      fs.closeSync(fd);
    }

    // Check WebP signature ('RIFF' + 4 bytes size + 'WEBP')
    const sig = buffer.toString('ascii', 0, 4);
    const webp = buffer.toString('ascii', 8, 12);
    if (sig !== 'RIFF' || webp !== 'WEBP') {
      return {};
    }

    // VP8 chunk for lossy, VP8L for lossless
    const chunk = buffer.toString('ascii', 12, 16);
    let width = 0, height = 0;

    if (chunk === 'VP8 ') {
      // Simple VP8: width at 26-27, height at 28-29
      width = buffer.readUInt16LE(26) & 0x3FFF;
      height = buffer.readUInt16LE(28) & 0x3FFF;
    } else if (chunk === 'VP8L') {
      // Lossless: encoded in bits 4-17
      const bits = buffer.readUInt32LE(21);
      width = (bits & 0x3FFF) + 1;
      height = ((bits >> 14) & 0x3FFF) + 1;
    }

    return {
      dimensions: `${width}x${height}`,
      hasAlpha: chunk === 'VP8L', // VP8L supports alpha
    };
  }

  /**
   * Extract MP3 metadata (basic info from ID3/frame header)
   */
  private extractMp3Metadata(filePath: string): Partial<BinaryMetadata> {
    const buffer = Buffer.alloc(1024);
    const fd = fs.openSync(filePath, 'r');
    let bytesRead: number;
    try {
      bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
    } finally {
      fs.closeSync(fd);
    }

    // Check for ID3v2 tag
    if (bytesRead >= 10 && buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
      // ID3v2 header: size at bytes 6-9 (syncsafe integer)
      const _id3Size = ((buffer[6] & 0x7F) << 21) | ((buffer[7] & 0x7F) << 14) |
                       ((buffer[8] & 0x7F) << 7) | (buffer[9] & 0x7F);

      // Try to find frame headers after ID3 tag (not accurate without full parsing)
      return {
        compression: 'ID3v2',
      };
    }

    // Look for MP3 frame sync (0xFF 0xE0-0xFF)
    for (let i = 0; i < bytesRead - 4; i++) {
      if (buffer[i] === 0xFF && (buffer[i + 1] & 0xE0) === 0xE0) {
        const version = (buffer[i + 1] >> 3) & 0x03;
        const layer = (buffer[i + 1] >> 1) & 0x03;
        const bitrateIndex = (buffer[i + 2] >> 4) & 0x0F;
        const sampleRateIndex = (buffer[i + 2] >> 2) & 0x03;
        const channelMode = (buffer[i + 3] >> 6) & 0x03;

        // Version: 0=MPEG2.5, 1=reserved, 2=MPEG2, 3=MPEG1
        const versions = ['MPEG2.5', 'reserved', 'MPEG2', 'MPEG1'];
        // Layer: 0=reserved, 1=III, 2=II, 3=I
        const layers = ['reserved', 'III', 'II', 'I'];

        // Bitrate table for MPEG1 Layer III
        const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
        // Sample rate table for MPEG1
        const sampleRates = [44100, 48000, 32000, 0];

        let bitrate: string | undefined;
        let sampleRate: string | undefined;
        let channels: number | undefined;

        if (version === 3 && layer === 1 && bitrateIndex > 0 && bitrateIndex < 15) {
          bitrate = `${bitrates[bitrateIndex]}kbps`;
        }

        if (version === 3 && sampleRateIndex < 3) {
          sampleRate = `${sampleRates[sampleRateIndex] / 1000}kHz`;
        }

        if (channelMode === 3) {
          channels = 1; // Mono
        } else {
          channels = 2; // Stereo, Joint Stereo, Dual channel
        }

        return {
          bitrate,
          sampleRate,
          channels,
          compression: `${versions[version]} Layer ${layers[layer]}`,
        };
      }
    }

    return {};
  }

  /**
   * Extract WAV metadata
   */
  private extractWavMetadata(filePath: string): Partial<BinaryMetadata> {
    const buffer = Buffer.alloc(44);
    const fd = fs.openSync(filePath, 'r');
    try {
      fs.readSync(fd, buffer, 0, 44, 0);
    } finally {
      fs.closeSync(fd);
    }

    // Check RIFF signature
    if (buffer.toString('ascii', 0, 4) !== 'RIFF') {
      return {};
    }

    // Check WAVE format
    if (buffer.toString('ascii', 8, 12) !== 'WAVE') {
      return {};
    }

    // fmt chunk at byte 12
    // Channels at bytes 22-23
    const channels = buffer.readUInt16LE(22);
    // Sample rate at bytes 24-27
    const sampleRate = buffer.readUInt32LE(24);
    // Bits per sample at bytes 34-35
    const bitsPerSample = buffer.readUInt16LE(34);
    // Byte rate at bytes 28-31 (for bitrate calculation)
    const byteRate = buffer.readUInt32LE(28);

    return {
      channels,
      sampleRate: sampleRate >= 1000 ? `${sampleRate / 1000}kHz` : `${sampleRate}Hz`,
      bitrate: `${(byteRate * 8 / 1000).toFixed(0)}kbps`,
      colorDepth: `${bitsPerSample}-bit`,
    };
  }

  /**
   * Extract ZIP metadata (file count)
   */
  private extractZipMetadata(filePath: string): Partial<BinaryMetadata> {
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    // Read end of central directory record (last 22 bytes minimum)
    const endSize = Math.min(65536, fileSize);
    const buffer = Buffer.alloc(endSize);
    const fd = fs.openSync(filePath, 'r');
    try {
      fs.readSync(fd, buffer, 0, endSize, fileSize - endSize);
    } finally {
      fs.closeSync(fd);
    }

    // Look for end of central directory signature (0x06 0x05 0x4B 0x50)
    for (let i = endSize - 22; i >= 0; i--) {
      if (buffer[i] === 0x06 && buffer[i + 1] === 0x05 &&
          buffer[i + 2] === 0x4B && buffer[i + 3] === 0x50) {
        // Number of entries at offset 8 (2 bytes)
        const entryCount = buffer.readUInt16LE(i + 8);
        return {
          entryCount,
          compression: 'ZIP',
        };
      }
    }

    return { compression: 'ZIP' };
  }

  /**
   * Extract GZIP metadata
   */
  private extractGzMetadata(filePath: string): Partial<BinaryMetadata> {
    const buffer = Buffer.alloc(266); // 10 header + 256 for filename
    const fd = fs.openSync(filePath, 'r');
    try {
      fs.readSync(fd, buffer, 0, 266, 0);
    } finally {
      fs.closeSync(fd);
    }

    // Check GZIP signature (0x1F 0x8B)
    if (buffer[0] !== 0x1F || buffer[1] !== 0x8B) {
      return {};
    }

    // Compression method at byte 2
    const compressionMethod = buffer[2];

    return {
      compression: compressionMethod === 8 ? 'DEFLATE' : `method-${compressionMethod}`,
    };
  }

  /**
   * Extract TTF font metadata
   */
  private extractTtfMetadata(filePath: string): Partial<BinaryMetadata> {
    const buffer = Buffer.alloc(1024);
    const fd = fs.openSync(filePath, 'r');
    try {
      fs.readSync(fd, buffer, 0, 1024, 0);
    } finally {
      fs.closeSync(fd);
    }

    // Check TTF signature (0x00 0x01 0x00 0x00 or 'true' for Mac)
    const sfntVersion = buffer.toString('ascii', 0, 4);
    if (sfntVersion !== '\x00\x01\x00\x00' && sfntVersion !== 'true' && sfntVersion !== 'OTTO') {
      return {};
    }

    // Number of tables at bytes 4-5 (2 bytes)
    const numTables = buffer.readUInt16BE(4);

    // Search for 'name' table
    let nameTableOffset = 0;
    for (let i = 0; i < numTables; i++) {
      const tableOffset = 12 + i * 16;
      const tableTag = buffer.toString('ascii', tableOffset, tableOffset + 4);
      if (tableTag === 'name') {
        nameTableOffset = buffer.readUInt32BE(tableOffset + 8);
        break;
      }
    }

    if (nameTableOffset > 0 && nameTableOffset < 100000) {
      // Read name table header and records in one operation
      const maxRecords = 256;
      const recordSize = 12;
      const readSize = 10 + maxRecords * recordSize + 200; // header + records + string data

      const nameBuffer = Buffer.alloc(Math.min(readSize, 65536));
      const fd2 = fs.openSync(filePath, 'r');
      try {
        fs.readSync(fd2, nameBuffer, 0, nameBuffer.length, nameTableOffset);
      } finally {
        fs.closeSync(fd2);
      }

      const count = Math.min(nameBuffer.readUInt16BE(2), maxRecords);
      const stringOffset = nameBuffer.readUInt16BE(4);
      const recordsOffset = 6;

      // Look for font family name (name ID 1) or full font name (name ID 4)
      for (let i = 0; i < count; i++) {
        const recordOffset = recordsOffset + i * recordSize;
        if (recordOffset + 12 > nameBuffer.length) break;

        const platformID = nameBuffer.readUInt16BE(recordOffset);
        const nameID = nameBuffer.readUInt16BE(recordOffset + 6);
        const length = nameBuffer.readUInt16BE(recordOffset + 8);
        const offset = nameBuffer.readUInt16BE(recordOffset + 10);

        if ((nameID === 1 || nameID === 4) && platformID === 3 && length > 0 && length < 100) {
          const stringDataOffset = stringOffset + offset;
          if (stringDataOffset + length * 2 <= nameBuffer.length) {
            const stringData = nameBuffer.subarray(stringDataOffset, stringDataOffset + length * 2);
            const swapped = Buffer.from(stringData.swap16());
            const fontName = swapped.toString('utf16le').replace(/\0/g, '');
            if (fontName) {
              return { compression: fontName };
            }
          }
        }
      }
    }

    return {
      entryCount: numTables, // Number of font tables
    };
  }
}
