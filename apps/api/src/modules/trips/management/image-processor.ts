import sharp, { type Metadata } from 'sharp';
import { HttpError, invalid } from '../../../http.js';
import type { NormalizedThumbnail, ThumbnailProcessor } from './thumbnail.js';

export const MAX_IMAGE_BYTES = 10485760;

export const MAX_MULTIPART_BYTES = MAX_IMAGE_BYTES + 65536;
const MAX_PIXELS = 25000000;
const invalidImage = () =>
  new HttpError(422, 'INVALID_IMAGE', '圖片內容損壞或無法處理，請重新選擇。');

export const imageTooLarge = () =>
  new HttpError(413, 'IMAGE_TOO_LARGE', '圖片超過大小、像素、尺寸或單張限制。');
const unsupportedImage = () =>
  new HttpError(415, 'UNSUPPORTED_IMAGE_TYPE', '只接受單張靜態 JPG、PNG、WebP 圖片。');

function requireStaticContainer(input: Buffer): void {
  if (input.subarray(0, 5).toString('ascii') === '%PDF-') throw unsupportedImage();
  if (input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    for (let offset = 8; offset + 12 <= input.length;) {
      const length = input.readUInt32BE(offset);
      if (length > input.length - offset - 12) throw invalidImage();
      const kind = input.toString('ascii', offset + 4, offset + 8);
      if (kind === 'acTL') throw unsupportedImage();
      offset += length + 12;
      if (kind === 'IEND') break;
    }
  }
  if (
    input.length >= 12 &&
    input.toString('ascii', 0, 4) === 'RIFF' &&
    input.toString('ascii', 8, 12) === 'WEBP'
  ) {
    const end = input.readUInt32LE(4) + 8;
    if (end > input.length) throw invalidImage();
    for (let offset = 12; offset + 8 <= end;) {
      const length = input.readUInt32LE(offset + 4);
      if (length > end - offset - 8) throw invalidImage();
      const kind = input.toString('ascii', offset, offset + 4);
      if (
        kind === 'ANIM' ||
        kind === 'ANMF' ||
        (kind === 'VP8X' && length > 0 && (input[offset + 8]! & 2) !== 0)
      )
        throw unsupportedImage();
      offset += 8 + length + (length % 2);
    }
  }
}

export function requireUploadConnected(signal: AbortSignal): void {
  if (signal.aborted) {
    if (signal.reason instanceof HttpError) throw signal.reason;
    throw new HttpError(400, 'UPLOAD_INCOMPLETE', '圖片尚未完整傳送，請重新選圖後再試。');
  }
}

export const nativeThumbnailProcessor: ThumbnailProcessor = {
  async process(input, signal): Promise<NormalizedThumbnail> {
    requireUploadConnected(signal);
    if (!input.length) throw invalid('圖片檔案沒有內容，請重新選圖。');
    if (input.length > MAX_IMAGE_BYTES) throw imageTooLarge();
    requireStaticContainer(input);
    let metadata: Metadata;
    try {
      metadata = await sharp(input, { failOn: 'warning', limitInputPixels: false }).metadata();
    } catch {
      throw invalidImage();
    }
    if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1)
      throw unsupportedImage();
    const { width, height } = metadata;
    if (!width || !height) throw invalidImage();
    if (width > 16384 || height > 16384 || BigInt(width) * BigInt(height) > BigInt(MAX_PIXELS))
      throw imageTooLarge();
    try {
      for (const [edge, quality] of [
        [1200, 80],
        [960, 75],
        [640, 70],
      ] as const) {
        requireUploadConnected(signal);
        const output = await sharp(input, { failOn: 'warning', limitInputPixels: MAX_PIXELS })
          .rotate()
          .toColourspace('srgb')
          .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true })
          .webp({ quality })
          .timeout({ seconds: 10 })
          .toBuffer({ resolveWithObject: true });
        requireUploadConnected(signal);
        if (output.data.length > 0 && output.data.length <= 524288)
          return {
            bytes: output.data,
            mimeType: 'image/webp',
            width: output.info.width,
            height: output.info.height,
          };
      }
    } catch (error) {
      requireUploadConnected(signal);
      if (error instanceof HttpError) throw error;
      if (error instanceof Error && /timeout|timed out/i.test(error.message))
        throw new HttpError(408, 'UPLOAD_TIMEOUT', '圖片處理逾時，請先確認保存結果。');
      throw invalidImage();
    }
    throw invalidImage();
  },
};
