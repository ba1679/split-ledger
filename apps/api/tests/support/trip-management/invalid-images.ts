import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { crc32 } from 'node:zlib';
import { expect } from '@playwright/test';
import sharp from 'sharp';
import type { LedgerWorld } from '../world.js';
import { pngChunk, type UploadImage } from './generated-images.js';
import { createImageAssets } from './image-assets.js';

export const invalidImageLabels = [
  'HEIC',
  'HEIF',
  'AVIF',
  '靜態GIF',
  '動態GIF',
  'SVG',
  '多頁TIFF',
  'PDF',
  'APNG',
  '動態WebP',
  'HEIC偽裝JPEG',
  '文字偽裝PNG',
  '截斷JPEG',
  '零寬PNG',
  '零高PNG',
  '零bytesJPEG',
] as const;

export function pngChunks(bytes: Buffer) {
  const chunks: { type: string; data: Buffer }[] = [];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset);

    chunks.push({
      type: bytes.toString('ascii', offset + 4, offset + 8),
      data: bytes.subarray(offset + 8, offset + 8 + length),
    });
    offset += length + 12;
  }

  return chunks;
}

async function animated(format: 'gif' | 'webp' | 'tiff') {
  const pixels = Buffer.alloc(32 * 64 * 3);

  pixels.fill(Buffer.from([230, 30, 40]), 0, 32 * 32 * 3);
  pixels.fill(Buffer.from([20, 60, 220]), 32 * 32 * 3);

  return sharp(pixels, { raw: { width: 32, height: 64, channels: 3, pageHeight: 32 } })
    .toFormat(format)
    .toBuffer();
}

async function apng() {
  const frames = await Promise.all(
    ['#e61e28', '#143cdc'].map((background) =>
      sharp({ create: { width: 32, height: 32, channels: 3, background } })
        .png()
        .toBuffer(),
    ),
  );
  const first = pngChunks(frames[0]!),
    second = pngChunks(frames[1]!);
  const header = first.find((chunk) => chunk.type === 'IHDR')!.data;

  expect(second.find((chunk) => chunk.type === 'IHDR')!.data).toEqual(header);
  const control = Buffer.alloc(8);

  control.writeUInt32BE(2, 0);
  const frameControl = (sequence: number) => {
    const data = Buffer.alloc(26);

    data.writeUInt32BE(sequence, 0);
    data.writeUInt32BE(32, 4);
    data.writeUInt32BE(32, 8);
    data.writeUInt16BE(1, 20);
    data.writeUInt16BE(10, 22);

    return pngChunk('fcTL', data);
  };
  const frame2 = Buffer.concat(
    second.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data),
  );
  const sequence = Buffer.alloc(4);

  sequence.writeUInt32BE(2);

  return Buffer.concat([
    frames[0]!.subarray(0, 8),
    pngChunk('IHDR', header),
    pngChunk('acTL', control),
    frameControl(0),
    ...first.filter((chunk) => chunk.type === 'IDAT').map((chunk) => pngChunk('IDAT', chunk.data)),
    frameControl(1),
    pngChunk('fdAT', Buffer.concat([sequence, frame2])),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function pdf() {
  const content = '1 0 0 rg 0 0 32 32 re f\n';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 32 32] /Contents 4 0 R /Resources << >> >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}endstream`,
  ];
  let output = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(output);

  output += `xref\n0 5\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('')}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  return Buffer.from(output);
}

export async function invalidImageBytes(
  label: string,
): Promise<{ bytes: Buffer; extension: string; mimeType: string }> {
  expect(invalidImageLabels).toContain(label);
  if (label === 'HEIC' || label === 'HEIF' || label === 'HEIC偽裝JPEG') {
    const extension = label === 'HEIF' ? 'heif' : label === 'HEIC偽裝JPEG' ? 'jpg' : 'heic';
    const bytes = await readFile(
      new URL(
        `../../assets/images/synthetic.${label === 'HEIF' ? 'heif' : 'heic'}`,
        import.meta.url,
      ),
    );

    return {
      bytes,
      extension,
      mimeType: extension === 'jpg' ? 'image/jpeg' : `image/${extension}`,
    };
  }
  const image = () =>
    sharp({ create: { width: 32, height: 32, channels: 3, background: '#c25631' } });
  if (label === 'AVIF')
    return { bytes: await image().avif().toBuffer(), extension: 'avif', mimeType: 'image/avif' };
  if (label === '靜態GIF')
    return { bytes: await image().gif().toBuffer(), extension: 'gif', mimeType: 'image/gif' };
  if (label === '動態GIF')
    return { bytes: await animated('gif'), extension: 'gif', mimeType: 'image/gif' };
  if (label === '動態WebP')
    return { bytes: await animated('webp'), extension: 'webp', mimeType: 'image/webp' };
  if (label === '多頁TIFF')
    return { bytes: await animated('tiff'), extension: 'tiff', mimeType: 'image/tiff' };
  if (label === 'SVG')
    return {
      bytes: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="red"/></svg>',
      ),
      extension: 'svg',
      mimeType: 'image/svg+xml',
    };
  if (label === 'PDF') return { bytes: pdf(), extension: 'pdf', mimeType: 'application/pdf' };
  if (label === 'APNG') return { bytes: await apng(), extension: 'png', mimeType: 'image/png' };
  if (label === '文字偽裝PNG')
    return {
      bytes: Buffer.from('This is plain text, not PNG image data.'),
      extension: 'png',
      mimeType: 'image/png',
    };
  if (label === '零bytesJPEG')
    return { bytes: Buffer.alloc(0), extension: 'jpg', mimeType: 'image/jpeg' };
  if (label === '截斷JPEG') {
    const original = await image().jpeg().toBuffer();

    return {
      bytes: original.subarray(0, Math.floor(original.length / 2)),
      extension: 'jpg',
      mimeType: 'image/jpeg',
    };
  }
  const bytes = await image().png().toBuffer();

  bytes.writeUInt32BE(0, label === '零寬PNG' ? 16 : 20);
  bytes.writeUInt32BE(crc32(bytes.subarray(12, 29)), 29);

  return { bytes, extension: 'png', mimeType: 'image/png' };
}

export async function selectInvalidImage(world: LedgerWorld, label: string): Promise<void> {
  const input = await invalidImageBytes(label);

  expect(input.bytes.length).toBeLessThanOrEqual(10485760);
  const workspace = await createImageAssets();

  world.tripManagement.cleanups.add(() => workspace.dispose());
  const name = `input-${randomUUID()}.${input.extension}`;
  const asset = await workspace.write(name, input.bytes);
  const image: UploadImage = { bytes: input.bytes, name, mimeType: input.mimeType, asset };

  world.set('management:uploadFiles', [image]);
}
