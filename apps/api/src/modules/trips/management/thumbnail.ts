import type { TripCommandContext } from './lifecycle.js';

export interface ThumbnailCommandContext extends TripCommandContext {
  expectedThumbnailRevision: bigint;
}

export interface NormalizedThumbnail {
  bytes: Buffer;
  mimeType: 'image/webp';
  width: number;
  height: number;
}

// The actual decoder and admission policy are supplied by the feature implementation.
export interface ThumbnailProcessor {
  process(input: Buffer, signal: AbortSignal): Promise<NormalizedThumbnail>;
}
