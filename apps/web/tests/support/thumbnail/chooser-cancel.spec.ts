import { test, expect } from '@playwright/test';
import { cancelFileChooser } from './chooser-cancel.js';

test('chooser cancellation retains the exact File and emits cancel without input/change', async ({
  page,
}) => {
  await page.setContent(
    '<button onclick="document.querySelector(\'input\').click()">Pick</button><input type="file" hidden>',
  );
  const [first] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Pick' }).click(),
  ]);
  await first.setFiles({
    name: 'original.png',
    mimeType: 'image/png',
    buffer: Buffer.from('not decoded by this transport-only test'),
  });
  const result = await cancelFileChooser(page, page.getByRole('button', { name: 'Pick' }));
  expect(result.before).toHaveLength(1);
  expect(result.before[0]).toMatchObject({ name: 'original.png', type: 'image/png' });
  expect(result.sameReferences).toBe(true);
  expect(result.events).toEqual(['cancel']);
  const [next] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Pick' }).click(),
  ]);
  await next.setFiles({
    name: 'next.png',
    mimeType: 'image/png',
    buffer: Buffer.from('another opaque file for chooser test'),
  });
  expect(
    await next.element().evaluate((input) => (input as HTMLInputElement).files![0]!.name),
  ).toBe('next.png');
});
