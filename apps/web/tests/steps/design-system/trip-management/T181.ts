import { Then, expect } from '../../../support/fixtures.js';
import type { InitialRead } from '../../../support/loading/initial-read.js';
import { initialContentRegion } from '../../../support/loading/initial-skeleton.js';
import { managementUI, waitForManagementReads } from '../../../support/trips/management-fixture.js';
import { managementSnapshot } from '../../../../../api/tests/support/trip-management/baseline.js';
import {
  assertOtherDataUnchanged,
  ownerRead,
} from '../../../../../api/tests/support/trip-management/preservation.js';

Then('垃圾桶顯示已確認空狀態且沒有等待', async ({ world }) => {
  const state = world.get<InitialRead>('loading:initial'),
    ui = managementUI(world);
  expect(state.screen).toBe('垃圾桶');
  expect(state.result).toBe('成功空');
  expect(state.released).toBe(true);
  expect(state.authority).toMatchObject({ items: [] });
  const response = await ownerRead(world, '/api/trips/trash');
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ items: [] });
  const owner = world.users.get('Alice')!.id;
  const rows = await world.db.query(
    'SELECT id FROM trips WHERE owner_id=$1 AND deleted_at IS NOT NULL',
    [owner],
  );
  expect(rows.rows.length).toBe(0);
  const region = initialContentRegion(ui.page, state);
  await expect(
    region.getByText(/沒有(?:已刪除?|已移入垃圾桶的?)旅行|垃圾桶(?:目前)?是空的/).first(),
  ).toBeVisible();
  await expect(region).not.toHaveAttribute('aria-busy', 'true');
  await expect(region.getByRole('progressbar')).toHaveCount(0);
  await expect(
    region.locator('[data-skeleton]:visible, .skeleton:visible, .query-skeleton:visible'),
  ).toHaveCount(0);
  await expect(region.getByRole('status').filter({ hasText: /載入|讀取中|等待/ })).toHaveCount(0);
  await waitForManagementReads(ui);
  expect(ui.writes.length).toBe(0);
  expect(await managementSnapshot(world)).toEqual(state.before);
  const active = await ownerRead(world, '/api/trips');
  expect(active.status()).toBe(200);
  expect((await active.json()).items.map((trip: { name: string }) => trip.name).sort()).toEqual([
    '台南旅行',
    '日本旅行',
  ]);
  await assertOtherDataUnchanged(world);
});
