import { expect, type Page, type Route } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  seedLifecycleBaseline,
  managementSnapshot,
  managementTripId,
} from '../../../../api/tests/support/trip-management/baseline.js';
import { ownerRead } from '../../../../api/tests/support/trip-management/preservation.js';
import { login } from '../browser.js';
import { observeManagement, waitForManagementReads } from '../trips/management-fixture.js';
import { renderedImage } from './rendered-image.js';

export interface ThumbnailRead {
  result: string;
  tripId: string;
  name: string;
  item: Record<string, unknown>;
  cardBox: { x: number; y: number; width: number; height: number };
  imageBox: { x: number; y: number; width: number; height: number };
  scroll: { x: number; y: number };
  requests: number;
  settled: number;
  release(): void;
}

export async function arrangeThumbnailRead(
  page: Page,
  world: LedgerWorld,
  result: string,
): Promise<void> {
  expect(['延遲', '明確失敗']).toContain(result);
  await seedLifecycleBaseline(world, '一般可用');
  const tripId = managementTripId(world);
  const name = '日本旅行・京都奈良大阪金澤富士山與海邊溫泉的秋日慢遊回憶';
  await world.db.query('UPDATE trips SET name=$2 WHERE id=$1', [tripId, name]);
  world.set('management:before', await managementSnapshot(world));
  await login(page, world, 'Alice');
  const ui = observeManagement(page, world, '旅行清單');
  // Capture a genuine fully-loaded reference at the same viewport before isolating binary GETs.
  await page.goto('/trips');
  const card = page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name, exact: true }) });
  await expect(card).toHaveAttribute('href', `/trips/${tripId}`);
  expect(await renderedImage(card.locator('img:visible'))).toMatchObject({ width: 64, height: 48 });
  await waitForManagementReads(ui);
  const cardBox = await card.boundingBox(),
    imageBox = await card.locator('img:visible').boundingBox();
  const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  expect(cardBox).not.toBeNull();
  expect(imageBox).not.toBeNull();
  const response = await ownerRead(world, '/api/trips?limit=100');
  expect(response.status()).toBe(200);
  const item = (await response.json()).items.find((row: { id: string }) => row.id === tripId);
  expect(item).toMatchObject({ id: tripId, name, hasThumbnail: true });
  expect(item.expenseCount).toBe(
    world.get<{ expenses: unknown[] }>('management:before').expenses.length,
  );
  await page.goto('about:blank');
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const state: ThumbnailRead = {
    result,
    tripId,
    name,
    item,
    cardBox: cardBox!,
    imageBox: imageBox!,
    scroll,
    requests: 0,
    settled: 0,
    release,
  };
  const pattern = `**/api/trips/${tripId}/thumbnail/*`;
  let disposed = false;
  const handler = async (route: Route) => {
    expect(route.request().method()).toBe('GET');
    state.requests++;
    if (result === '延遲') {
      await gate;
      if (!page.isClosed()) await route.fallback();
    } else await route.abort('failed');
    state.settled++;
  };
  await page.route(pattern, handler);
  world.tripManagement.cleanups.add(async () => {
    if (disposed) return;
    disposed = true;
    release();
    await expect.poll(() => state.settled === state.requests).toBe(true);
    if (!page.isClosed()) await page.unroute(pattern, handler);
  });
  expect(ui.writes.length).toBe(0);
  world.set('management:thumbnailRead', state);
}
