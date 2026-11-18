import { createHash } from 'node:crypto';
import { expect, type ElementHandle } from '@playwright/test';
import type { UploadImage } from '../../../../api/tests/support/trip-management/generated-images.js';

/** Explicit DSL fault input: native FileList injection without weakening the single-file picker. */
export async function injectMultipleFiles(
  input: ElementHandle<Node>,
  files: readonly UploadImage[],
): Promise<void> {
  expect(files).toHaveLength(2);
  expect(await input.getAttribute('multiple')).toBeNull();
  const actual = await input.evaluate(
    async (element, values) => {
      if (!(element instanceof HTMLInputElement)) throw new Error('Expected the native file input');
      const transfer = new DataTransfer();
      for (const value of values)
        transfer.items.add(
          new File([new Uint8Array(value.bytes)], value.name, { type: value.type }),
        );
      element.files = transfer.files;
      const selected = [...element.files];
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));

      return Promise.all(
        selected.map(async (file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          bytes: [...new Uint8Array(await file.arrayBuffer())],
        })),
      );
    },
    files.map((file) => ({ name: file.name, type: file.mimeType, bytes: [...file.bytes] })),
  );
  expect(
    actual.map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      hash: createHash('sha256').update(Buffer.from(file.bytes)).digest('hex'),
    })),
  ).toEqual(
    files.map((file) => ({
      name: file.name,
      type: file.mimeType,
      size: file.bytes.length,
      hash: file.asset.sha256,
    })),
  );
  expect(await input.getAttribute('multiple')).toBeNull();
}
