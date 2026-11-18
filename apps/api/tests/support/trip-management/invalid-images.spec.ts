import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { crc32, inflateSync } from 'node:zlib';
import sharp from 'sharp';
import { invalidImageBytes, invalidImageLabels, pngChunks } from './invalid-images.js';
import { pngChunk } from './generated-images.js';

for (const label of invalidImageLabels) {
  test(`negative image fixture contains real ${label} structure`, async () => {
    const { bytes, mimeType } = await invalidImageBytes(label);

    expect(bytes.length).toBeLessThanOrEqual(10485760);
    if (label === 'HEIC' || label === 'HEIF' || label === 'HEIC偽裝JPEG') {
      const source = await readFile(
        new URL(
          `../../assets/images/synthetic.${label === 'HEIF' ? 'heif' : 'heic'}`,
          import.meta.url,
        ),
      );

      expect(createHash('sha256').update(bytes).digest('hex')).toBe(
        createHash('sha256').update(source).digest('hex'),
      );
      expect(bytes.toString('ascii', 4, 8)).toBe('ftyp');
      expect(bytes.toString('ascii', 8, 12)).toBe(label === 'HEIF' ? 'mif1' : 'heic');
      expect(bytes.includes(Buffer.from('hvc1'))).toBe(true);
      expect(bytes.includes(Buffer.from('mdat'))).toBe(true);
      if (label === 'HEIC偽裝JPEG') expect(mimeType).toBe('image/jpeg');
    } else if (label === 'APNG') {
      const chunks = pngChunks(bytes);

      expect(chunks.find((chunk) => chunk.type === 'acTL')!.data.readUInt32BE(0)).toBe(2);
      expect(
        chunks
          .filter((chunk) => chunk.type === 'fcTL' || chunk.type === 'fdAT')
          .map((chunk) => chunk.data.readUInt32BE(0)),
      ).toEqual([0, 1, 2]);
      const compressed = Buffer.concat(
        chunks.filter((chunk) => chunk.type === 'fdAT').map((chunk) => chunk.data.subarray(4)),
      );

      expect(inflateSync(compressed).length).toBeGreaterThan(32 * 32 * 3);
      const second = Buffer.concat([
        bytes.subarray(0, 8),
        pngChunk('IHDR', chunks.find((chunk) => chunk.type === 'IHDR')!.data),
        pngChunk('IDAT', compressed),
        pngChunk('IEND', Buffer.alloc(0)),
      ]);
      const firstStats = await sharp(bytes).stats(),
        secondStats = await sharp(second).stats();

      expect(firstStats.channels[0]!.mean).toBeGreaterThan(firstStats.channels[2]!.mean);
      expect(secondStats.channels[2]!.mean).toBeGreaterThan(secondStats.channels[0]!.mean);
    } else if (label === '動態GIF' || label === '動態WebP' || label === '多頁TIFF') {
      const decoder = sharp(bytes, { animated: true });

      const metadata = await decoder.metadata();

      expect(metadata.pages).toBe(2);
      expect(metadata.format).toBe(
        label === '動態GIF' ? 'gif' : label === '動態WebP' ? 'webp' : 'tiff',
      );
      await decoder.stats();
    } else if (['零寬PNG', '零高PNG', '截斷JPEG', '文字偽裝PNG', '零bytesJPEG'].includes(label)) {
      if (label.startsWith('零') && label.endsWith('PNG')) {
        expect(bytes.readUInt32BE(label === '零寬PNG' ? 16 : 20)).toBe(0);
        expect(bytes.readUInt32BE(29)).toBe(crc32(bytes.subarray(12, 29)));
      }
      await expect(
        Promise.resolve().then(() => sharp(bytes, { failOn: 'warning' }).stats()),
      ).rejects.toThrow();
    } else if (label === 'PDF') {
      expect(bytes.toString().startsWith('%PDF-1.4')).toBe(true);
      const xref = Number(/startxref\n(\d+)/.exec(bytes.toString())![1]);

      expect(bytes.toString('ascii', xref, xref + 4)).toBe('xref');
      expect(bytes.toString()).toContain('/Type /Page /Parent');
    } else {
      const decoder = sharp(bytes);

      const metadata = await decoder.metadata();

      expect(metadata.width).toBe(32);
      if (label === 'AVIF') expect(bytes.toString('ascii', 4, 12)).toBe('ftypavif');
      else expect(metadata.format).toBe(label === 'SVG' ? 'svg' : 'gif');
      await decoder.stats();
    }
  });
}
