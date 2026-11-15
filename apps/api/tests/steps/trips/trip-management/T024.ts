import { When, expect } from '../../../support/fixtures.js';
import {
  managementSnapshot,
  managementTripId,
  sharedSnapshot,
} from '../../../support/trip-management/baseline.js';
import { ownerRead } from '../../../support/trip-management/preservation.js';

When('owner 讀取垃圾桶旅行的 {string}', async ({ world }, resource: string) => {
  const tripId = managementTripId(world);
  const before = await managementSnapshot(world);

  expect(before.trips[0]!.deleted_at).not.toBeNull();
  const paths: Record<string, string> = {
    旅行: '',
    支出清單: '/expenses',
    單筆支出: `/expenses/${world.splitting.ids.expenses.get('晚餐')!}`,
    總額: '/totals',
    同行者: '/members',
    還款清單: '/repayments',
    單筆還款: `/repayments/${world.splitting.ids.repayments.get('獨立還款')!}`,
    付款安排: '/settlement',
    結清紀錄: `/settlements/${world.splitting.ids.settlements.get('結清')!}`,
    普通縮圖: `/thumbnail/${String(before.trips[0]!.thumbnail_revision)}`,
    不存在的單筆支出: `/expenses/${world.get<string>('management:unknownExpenseId')}`,
  };

  expect(Object.keys(paths)).toContain(resource);
  world.set('management:before', before);
  world.set('management:sharedBefore', await sharedSnapshot(world));
  world.response = await ownerRead(world, `/api/trips/${tripId}${paths[resource]!}`);
});
