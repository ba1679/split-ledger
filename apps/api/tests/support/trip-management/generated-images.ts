import { expect } from '@playwright/test';
import { crc32 } from 'node:zlib';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { LedgerWorld } from '../world.js';
import { createImageAssets, type ImageAsset } from './image-assets.js';

export interface UploadImage {
  bytes: Buffer;
  name: string;
  mimeType: string;
  asset: ImageAsset;
}

export function pngChunk(type: string, payload: Buffer): Buffer {
  const chunk = Buffer.alloc(payload.length + 12);

  chunk.writeUInt32BE(payload.length, 0);
  chunk.write(type, 4, 4, 'ascii');
  payload.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(payload, crc32(Buffer.from(type))), payload.length + 8);

  return chunk;
}

export async function generateExactImage(
  format: string,
  size: number,
  width: number,
  height: number,
): Promise<Buffer> {
  expect(['JPEG .jpg', 'JPEG .jpeg', 'PNG', 'WebP']).toContain(format);
  for (const value of [size, width, height])
    expect(Number.isSafeInteger(value) && value > 0).toBe(true);
  const kind = format.startsWith('JPEG') ? 'jpeg' : format === 'PNG' ? 'png' : 'webp';
  const input = sharp({ create: { width, height, channels: 3, background: '#438ca1' } });
  const encoded = await input.toFormat(kind).toBuffer();
  const extra = size - encoded.length;

  expect(
    extra,
    'Exact-size fixture must have enough space for legal container padding',
  ).toBeGreaterThanOrEqual(0);
  let bytes = encoded;
  if (extra > 0 && kind === 'png') {
    expect(extra).toBeGreaterThanOrEqual(12);
    bytes = Buffer.concat([
      encoded.subarray(0, -12),
      pngChunk('npAd', Buffer.alloc(extra - 12)),
      encoded.subarray(-12),
    ]);
  } else if (extra > 0 && kind === 'jpeg') {
    const comments: Buffer[] = [];
    let left = extra;
    while (left > 0) {
      expect(left).toBeGreaterThanOrEqual(4);
      let length = Math.min(left, 65537);
      const rest = left - length;
      if (rest > 0 && rest < 4) length -= 4 - rest;
      const comment = Buffer.alloc(length);

      comment.writeUInt16BE(0xfffe, 0);
      comment.writeUInt16BE(length - 2, 2);
      comments.push(comment);
      left -= length;
    }
    bytes = Buffer.concat([encoded.subarray(0, 2), ...comments, encoded.subarray(2)]);
  } else if (extra > 0) {
    expect(extra).toBeGreaterThanOrEqual(8);
    expect(extra % 2, 'RIFF chunks include even-byte padding').toBe(0);
    const chunk = Buffer.alloc(extra);

    chunk.write('JUNK', 0, 4, 'ascii');
    chunk.writeUInt32LE(extra - 8, 4);
    bytes = Buffer.concat([encoded, chunk]);
    bytes.writeUInt32LE(bytes.length - 8, 4);
  }
  expect(bytes.length).toBe(size);
  const decoder = sharp(bytes, { failOn: 'warning', limitInputPixels: false });
  const metadata = await decoder.metadata();

  expect(metadata).toMatchObject({ format: kind, width, height });
  expect(metadata.pages ?? 1).toBe(1);
  await decoder.stats(); // Full native decode, not a mocked header/metadata result.

  return bytes;
}

export async function selectExactImage(
  world: LedgerWorld,
  format: string,
  size: number,
  width: number,
  height: number,
): Promise<void> {
  const bytes = await generateExactImage(format, size, width, height);
  const workspace = await createImageAssets();

  world.tripManagement.cleanups.add(() => workspace.dispose());
  const extension =
    format === 'JPEG .jpeg' ? 'jpeg' : format.startsWith('JPEG') ? 'jpg' : format.toLowerCase();
  const name = `selected-${randomUUID()}.${extension}`;
  const asset = await workspace.write(name, bytes);
  const image: UploadImage = {
    bytes,
    name,
    mimeType: format.startsWith('JPEG') ? 'image/jpeg' : `image/${extension}`,
    asset,
  };

  world.set('management:uploadFiles', [image]);
}

/** Distinct native pixels for a later owner image intent. */
export async function seaImage(): Promise<Buffer> {
  return sharp({ create: { width: 80, height: 60, channels: 3, background: '#2d73bd' } })
    .png()
    .toBuffer();
}
