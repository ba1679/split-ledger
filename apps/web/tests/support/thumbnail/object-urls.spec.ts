import { renderedImage } from './rendered-image.js';
import { test, expect } from '@playwright/test';
import { generateExactImage } from '../../../../api/tests/support/trip-management/generated-images.js';
import {
  observeObjectUrls,
  objectUrls,
  assertDraftUrlsReleased,
  restoreObjectUrls,
} from './object-urls.js';

test('native Blob instrumentation preserves PNG bytes/decoding and real revocation', async ({
  page,
}) => {
  const bytes = await generateExactImage('PNG', 65536, 64, 48);
  await page.evaluate(() => {
    (window as unknown as { originalTestCreate: typeof URL.createObjectURL }).originalTestCreate =
      URL.createObjectURL;
  });
  await observeObjectUrls(page);
  try {
    const result = await page.evaluate(
      async (data) => {
        const file = new File([Uint8Array.from(data)], 'shrine.png', { type: 'image/png' });
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.src = url;
        await image.decode();
        const fetched = [...new Uint8Array(await (await fetch(url)).arrayBuffer())];

        return { url, width: image.naturalWidth, height: image.naturalHeight, fetched };
      },
      [...bytes],
    );
    await page.setContent(`<img alt="Native preview" src="${result.url}">`);
    expect(await renderedImage(page.getByRole('img', { name: 'Native preview' }))).toEqual({
      width: 64,
      height: 48,
      rgba: [67, 140, 161, 255],
    });
    expect(result.width).toBe(64);
    expect(result.height).toBe(48);
    expect(Buffer.from(result.fetched)).toEqual(bytes);
    expect(await objectUrls(page)).toEqual([
      {
        url: result.url,
        name: 'shrine.png',
        type: 'image/png',
        size: bytes.length,
        revoked: false,
      },
    ]);
    await page.evaluate((url) => URL.revokeObjectURL(url), result.url);
    await assertDraftUrlsReleased(page);
  } finally {
    await restoreObjectUrls(page);
  }
  expect(
    await page.evaluate(
      () =>
        URL.createObjectURL ===
        (window as unknown as { originalTestCreate: typeof URL.createObjectURL })
          .originalTestCreate,
    ),
  ).toBe(true);
});
