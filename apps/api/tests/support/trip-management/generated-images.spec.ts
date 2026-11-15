import { test, expect } from '@playwright/test';
import { crc32 } from 'node:zlib';
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { withImageAssets } from './image-assets.js';
import { generateExactImage } from './generated-images.js';

const cases: [string, number, number, number][] = [
  ...['JPEG .jpg', 'JPEG .jpeg', 'PNG', 'WebP'].map(
    (format) => [format, 1048576, 4000, 3000] as [string, number, number, number],
  ),
  ['PNG', 10485759, 4000, 3000],
  ['PNG', 10485760, 4000, 3000],
  ['PNG', 1048576, 5000, 5000],
  ['PNG', 10485760, 5000, 5000],
  ['PNG', 65536, 16384, 1],
  ['PNG', 65536, 1, 16384],
  ['PNG', 256, 1, 1],
  ['PNG', 10485761, 4000, 3000],
  ['PNG', 1048576, 5001, 5000],
  ['PNG', 65536, 16385, 1],
  ['PNG', 65536, 1, 16385],
];
const previous = sharp.cache();

test.beforeAll(() => {
  sharp.cache(false);
});
test.afterAll(() => {
  sharp.cache({
    memory: previous.memory.max,
    files: previous.files.max,
    items: previous.items.max,
  });
});
for (const [format, size, width, height] of cases) {
  test(`real fixture ${format} ${size} ${width}x${height} has structurally valid padding`, async () => {
    const bytes = await generateExactImage(format, size, width, height);

    if (format === 'PNG') {
      expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      let offset = 8;
      while (offset < bytes.length) {
        const length = bytes.readUInt32BE(offset);
        const crc = crc32(bytes.subarray(offset + 4, offset + 8 + length));

        expect(bytes.readUInt32BE(offset + 8 + length)).toBe(crc);
        offset += length + 12;
      }
      expect(offset).toBe(bytes.length);
      expect(bytes.subarray(-8, -4).toString()).toBe('IEND');
    } else if (format.startsWith('JPEG')) {
      expect(bytes.readUInt16BE(0)).toBe(0xffd8);
      expect(bytes.readUInt16BE(2)).toBe(0xfffe);
      expect(bytes.subarray(-2).toString('hex')).toBe('ffd9');
    } else {
      expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
      expect(bytes.readUInt32LE(4)).toBe(bytes.length - 8);
      let offset = 12,
        junk = false;
      while (offset < bytes.length) {
        junk ||= bytes.toString('ascii', offset, offset + 4) === 'JUNK';
        const length = bytes.readUInt32LE(offset + 4);

        offset += 8 + length + (length % 2);
      }
      expect(offset).toBe(bytes.length);
      expect(junk).toBe(true);
    }
  });
}

test('image workspace keeps a real file during the callback and cleans on success and failure', async () => {
  for (const fail of [false, true]) {
    let directory = '';
    const operation = withImageAssets(async (workspace) => {
      directory = workspace.directory;
      const asset = await workspace.write('sample.bin', Buffer.from('original bytes'));

      expect(existsSync(asset.path)).toBe(true);
      if (fail) throw new Error('deliberate cleanup probe');
    });

    if (fail) await expect(operation).rejects.toThrow('deliberate cleanup probe');
    else await operation;
    expect(existsSync(directory)).toBe(false);
  }
});
