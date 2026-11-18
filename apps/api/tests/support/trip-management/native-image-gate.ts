import { expect } from '@playwright/test';
import sharp from 'sharp';

/** Delay delivery of genuine native WebP output, without replacing decoding or encoded bytes. */
export function holdNativeWebpOutput() {
  const prototype = Object.getPrototypeOf(sharp()) as { toBuffer: (...args: unknown[]) => unknown };
  const original = prototype.toBuffer;
  let reached = false,
    released = false;
  let unblock!: () => void;
  const gate = new Promise<void>((resolve) => {
    unblock = resolve;
  });
  const pause = async (value: unknown) => {
    const data = Buffer.isBuffer(value)
      ? value
      : value && typeof value === 'object' && 'data' in value
        ? value.data
        : undefined;

    if (!Buffer.isBuffer(data)) return;
    let format: string | undefined;
    try {
      format = (await sharp(data).metadata()).format;
    } catch {
      return;
    } // Raw output is not an encoded WebP pipeline.
    if (format !== 'webp') return;
    reached = true;
    await gate;
  };
  const wrapped = function (this: unknown, ...args: unknown[]) {
    const callbackIndex = args.findIndex((value) => typeof value === 'function');

    if (callbackIndex >= 0) {
      const callback = args[callbackIndex] as (...values: unknown[]) => unknown;

      args[callbackIndex] = (error: unknown, data: unknown, info: unknown) => {
        if (error) return Reflect.apply(callback, this, [error, data, info]);
        void pause(data).then(
          () => Reflect.apply(callback, this, [null, data, info]),
          (failure) => Reflect.apply(callback, this, [failure]),
        );
      };

      return Reflect.apply(original, this, args);
    }
    const output = Reflect.apply(original, this, args);

    if (output && typeof output === 'object' && 'then' in output)
      return Promise.resolve(output).then(async (value) => {
        await pause(value);

        return value;
      });

    return output;
  };

  prototype.toBuffer = wrapped;

  return {
    async waitUntilReached() {
      await expect
        .poll(() => reached, {
          timeout: 5000,
          message: 'The real native WebP conversion must finish before commit',
        })
        .toBe(true);
    },
    release() {
      if (!released) {
        released = true;
        unblock();
      }
    },
    restore() {
      if (!released) {
        released = true;
        unblock();
      }
      if (prototype.toBuffer === wrapped) prototype.toBuffer = original;
    },
  };
}
