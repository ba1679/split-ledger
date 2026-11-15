import { Then, expect } from '../../../support/fixtures.js';
import {
  assertCardIdentity,
  assertReadOnlyThumbnail,
} from '../../../support/thumbnail/card-result.js';

Then('縮圖區域保留位置且旅行識別與入口可用', async ({ world }) => {
  const { state, card } = await assertCardIdentity(world);
  expect(state.result).toBe('延遲');
  expect(state.requests).toBeGreaterThan(0);
  expect(state.settled).toBe(0);
  const spinner = card.getByRole('status');
  await expect(spinner).toBeVisible();
  await expect(spinner).toHaveAccessibleName(
    /(?:載入|讀取).*(?:圖片|縮圖)|(?:圖片|縮圖).*(?:載入|讀取)/,
  );
  await expect(spinner).toHaveText('');
  expect(await spinner.getAttribute('tabindex')).not.toBe('0');
  await expect(spinner.locator('button,a,input,[tabindex="0"]')).toHaveCount(0);
  const box = await spinner.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(state.imageBox.x);
  expect(box!.y).toBeGreaterThanOrEqual(state.imageBox.y);
  expect(box!.x + box!.width).toBeLessThanOrEqual(state.imageBox.x + state.imageBox.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(state.imageBox.y + state.imageBox.height);
  await assertReadOnlyThumbnail(world);
});
