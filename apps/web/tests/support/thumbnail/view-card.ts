import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementUI } from '../trips/management-fixture.js';
import type { ThumbnailRead } from './read-fixture.js';

export async function viewThumbnailCard(world: LedgerWorld): Promise<void> {
  const state = world.get<ThumbnailRead>('management:thumbnailRead');
  const { page } = managementUI(world);
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/trips',
  );
  // load would wait for the deliberately held image; only the document and data must finish.
  await page.goto('/trips', { waitUntil: 'domcontentloaded' });
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(await response.finished()).toBeNull();
  const item = (await response.json()).items.find((row: { id: string }) => row.id === state.tripId);
  expect(item).toEqual(state.item);
  await expect(page.getByRole('heading', { name: state.name, exact: true })).toBeVisible();
  await expect.poll(() => state.requests).toBeGreaterThan(0);
  if (state.result === '延遲') expect(state.settled).toBe(0);
  else await expect.poll(() => state.settled === state.requests).toBe(true);
  expect(managementUI(world).writes.length).toBe(0);
}
