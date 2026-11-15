import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import sharp, { type Metadata } from 'sharp';

export interface ImageAsset {
  readonly path: string;
  readonly sha256: string;
  readonly byteLength: number;
}

export type ImageDecoderMetadata = Metadata;

export interface ImageGenerationRequest {
  format: 'jpeg' | 'png' | 'webp';
  width: number;
  height: number;
  exactByteLength?: number;
}

// Individual RED tasks supply real generators, including independently checked boundary padding.
export interface ImageFixtureGenerator {
  generate(request: ImageGenerationRequest): Promise<Buffer>;
}

export interface ImageAssetWorkspace {
  readonly directory: string;
  write(name: string, bytes: Buffer): Promise<ImageAsset>;
  metadata(bytes: Buffer): Promise<ImageDecoderMetadata>;
}

export async function createImageAssets() {
  const directory = await mkdtemp(join(tmpdir(), 'ledger-images-'));

  return {
    directory,
    async write(name: string, bytes: Buffer): Promise<ImageAsset> {
      if (!name || basename(name) !== name) throw new Error('Image asset needs a plain filename');
      const path = join(directory, name);

      await writeFile(path, bytes, { flag: 'wx' });

      return {
        path,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        byteLength: bytes.length,
      };
    },
    metadata: (bytes: Buffer) => sharp(bytes).metadata(),
    async dispose() {
      await rm(directory, { recursive: true, force: true });
    },
  };
}

export async function withImageAssets<T>(
  run: (workspace: ImageAssetWorkspace) => Promise<T>,
): Promise<T> {
  const workspace = await createImageAssets();

  try {
    return await run(workspace);
  } finally {
    await workspace.dispose();
  }
}
