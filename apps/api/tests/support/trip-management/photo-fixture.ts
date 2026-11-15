import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import sharp from 'sharp';
import type { LedgerWorld } from '../world.js';
import { pngChunk, type UploadImage } from './generated-images.js';
import { createImageAssets } from './image-assets.js';

export interface PhotoExpectation {
  kind: string;
  width: number;
  height: number;
  corners?: number[][];
  alpha?: number;
}

/** Minimal TIFF IFD0 orientation plus real GPS IFD and rational coordinates (synthetic 25N/121E). */
function exifTiff(orientation: number) {
  const gps = 38,
    latitude = 104,
    longitude = 128;
  const bytes = Buffer.alloc(152);

  bytes.write('II', 0);
  bytes.writeUInt16LE(42, 2);
  bytes.writeUInt32LE(8, 4);
  bytes.writeUInt16LE(2, 8);
  const entry = (offset: number, tag: number, type: number, count: number, value: number) => {
    bytes.writeUInt16LE(tag, offset);
    bytes.writeUInt16LE(type, offset + 2);
    bytes.writeUInt32LE(count, offset + 4);
    bytes.writeUInt32LE(value, offset + 8);
  };

  entry(10, 0x0112, 3, 1, orientation);
  entry(22, 0x8825, 4, 1, gps);
  bytes.writeUInt16LE(5, gps);
  entry(40, 0, 1, 4, 0x00000302);
  entry(52, 1, 2, 2, 'N'.charCodeAt(0));
  entry(64, 2, 5, 3, latitude);
  entry(76, 3, 2, 2, 'E'.charCodeAt(0));
  entry(88, 4, 5, 3, longitude);
  for (const [offset, degrees] of [
    [latitude, 25],
    [longitude, 121],
  ])
    for (let index = 0; index < 3; index++) {
      bytes.writeUInt32LE(index === 0 ? degrees! : 0, offset! + index * 8);
      bytes.writeUInt32LE(1, offset! + index * 8 + 4);
    }

  return bytes;
}

function jpegExif(jpeg: Buffer, orientation: number) {
  const tiff = exifTiff(orientation);
  const segment = Buffer.alloc(tiff.length + 10);

  segment.writeUInt16BE(0xffe1, 0);
  segment.writeUInt16BE(segment.length - 2, 2);
  segment.write('Exif\0\0', 4, 6, 'binary');
  tiff.copy(segment, 10);

  return Buffer.concat([jpeg.subarray(0, 2), segment, jpeg.subarray(2)]);
}

export async function makePhoto(
  kind: string,
): Promise<{ bytes: Buffer; extension: string; expected: PhotoExpectation }> {
  expect(['直拍照片', '複雜照片', '小圖']).toContain(kind);
  if (kind === '小圖') {
    const png = await sharp(Buffer.from([67, 140, 161, 128]), {
      raw: { width: 1, height: 1, channels: 4 },
    })
      .withIccProfile('srgb')
      .png()
      .toBuffer();

    return {
      bytes: Buffer.concat([png.subarray(0, 33), pngChunk('eXIf', exifTiff(1)), png.subarray(33)]),
      extension: 'png',
      expected: { kind, width: 1, height: 1, alpha: 128 },
    };
  }
  const width = kind === '複雜照片' ? 1600 : 80,
    height = kind === '複雜照片' ? 1200 : 48;
  const pixels = Buffer.alloc(width * height * 3);
  if (kind === '複雜照片') {
    let state = 0x9e3779b9;
    for (let index = 0; index < pixels.length; index++) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      pixels[index] = state & 255;
    }
  } else {
    const colours = [
      [224, 32, 32],
      [32, 208, 64],
      [32, 64, 224],
      [224, 208, 32],
    ];
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const corner = (x < 12 || x >= width - 12) && (y < 12 || y >= height - 12);
        const colour = corner
          ? colours[(y >= height - 12 ? 2 : 0) + (x >= width - 12 ? 1 : 0)]!
          : [128, 128, 128];

        for (let channel = 0; channel < 3; channel++)
          pixels[(y * width + x) * 3 + channel] = colour[channel]!;
      }
  }
  const jpeg = await sharp(pixels, { raw: { width, height, channels: 3 } })
    .withIccProfile('srgb')
    .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
    .toBuffer();
  const bytes = jpegExif(jpeg, kind === '直拍照片' ? 6 : 1);

  expect(bytes.length).toBeLessThanOrEqual(10485760);
  if (kind === '複雜照片') {
    const first = await sharp(bytes)
      .rotate()
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    const second = await sharp(bytes)
      .rotate()
      .resize({ width: 960, height: 960, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();

    expect(
      first.length,
      'High-entropy fixture really exercises the next bounded candidate',
    ).toBeGreaterThan(524288);
    expect(second.length).toBeLessThanOrEqual(524288);

    return { bytes, extension: 'jpg', expected: { kind, width: 960, height: 720 } };
  }

  return {
    bytes,
    extension: 'jpg',
    expected: {
      kind,
      width: 48,
      height: 80,
      corners: [
        [32, 64, 224],
        [224, 32, 32],
        [224, 208, 32],
        [32, 208, 64],
      ],
    },
  };
}

export async function selectPhoto(world: LedgerWorld, kind: string): Promise<void> {
  const { bytes, extension, expected } = await makePhoto(kind);
  const metadata = await sharp(bytes).metadata();

  expect(metadata.exif).toBeDefined();
  expect(metadata.icc).toBeDefined();
  expect(metadata.orientation).toBe(kind === '直拍照片' ? 6 : 1);
  const workspace = await createImageAssets();

  world.tripManagement.cleanups.add(() => workspace.dispose());
  const name = `photo-${randomUUID()}.${extension}`;
  const asset = await workspace.write(name, bytes);
  const image: UploadImage = {
    bytes,
    name,
    mimeType: extension === 'png' ? 'image/png' : 'image/jpeg',
    asset,
  };

  world.set('management:uploadFiles', [image]);
  world.set('management:photoExpectation', expected);
}
