import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { holdNativeWebpOutput } from './native-image-gate.js';

test('native output gate preserves actual promise and callback output and restores the prototype', async () => {
  const png = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#e94b35' } })
    .png()
    .toBuffer();
  const expected = await sharp(png).webp().toBuffer();
  for (const callback of [false, true]) {
    const gate = holdNativeWebpOutput();
    let finished = false;
    const output = callback
      ? new Promise<Buffer>((resolve, reject) =>
          sharp(png)
            .webp()
            .toBuffer((error, data) => (error ? reject(error) : resolve(data))),
        )
      : sharp(png).webp().toBuffer();
    const pending = output.then((bytes) => {
      finished = true;

      return bytes;
    });

    try {
      await gate.waitUntilReached();
      expect(finished).toBe(false);
    } finally {
      gate.release();
      gate.restore();
    }
    const actual = await pending;

    expect(createHash('sha256').update(actual).digest('hex')).toBe(
      createHash('sha256').update(expected).digest('hex'),
    );
  }
  expect(await sharp(png).webp().toBuffer()).toEqual(expected);
});
