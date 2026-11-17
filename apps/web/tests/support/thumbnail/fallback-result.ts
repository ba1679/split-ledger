import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { assertCardIdentity, assertReadOnlyThumbnail } from './card-result.js';

export async function assertThumbnailFallback(world: LedgerWorld): Promise<void> {
  const { state, card, page } = await assertCardIdentity(world);
  expect(state.result).toBe('明確失敗');
  expect(state.requests).toBeGreaterThan(0);
  expect(state.settled).toBe(state.requests);
  await expect(card.getByRole('status')).toBeHidden();
  await expect(card.getByRole('progressbar')).toHaveCount(0);
  await expect(card.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(card.locator('img[src*="/thumbnail/"]:visible')).toHaveCount(0);
  const fallback = card.locator('.landscape:visible,[role="img"]:visible').first();
  await expect(fallback).toBeVisible();
  const box = await fallback.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(state.imageBox.height - 1);
  expect(box!.width).toBeGreaterThanOrEqual(state.imageBox.width - 1);
  // Do not concatenate the image-failure caption with the normal ledger CTA
  // by matching the whole card; independent ledger error messages still fail.
  await expect(
    card
      .getByText(/(?:無法|失敗|重試).*(?:旅行資料|帳本)/)
      .filter({ hasNot: page.getByRole('heading') }),
  ).toBeHidden();
  await assertReadOnlyThumbnail(world);
}
