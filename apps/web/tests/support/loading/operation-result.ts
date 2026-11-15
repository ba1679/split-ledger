import { expect, type Browser, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { TripManagementSnapshot } from '../../../../api/tests/support/trip-management/context.js';
import {
  managementSnapshot,
  sharedSnapshot,
} from '../../../../api/tests/support/trip-management/baseline.js';
import {
  ownerRead,
  assertPreservedTrip,
} from '../../../../api/tests/support/trip-management/preservation.js';
import { assertLifecycleTransition } from '../../../../api/tests/support/trip-management/lifecycle-result.js';
import { assertPurgedTrip } from '../../../../api/tests/support/trip-management/purge-result.js';
import { assertThumbnailSaved } from '../../../../api/tests/support/trip-management/thumbnail-result.js';
import { assertThumbnailReset } from '../../../../api/tests/support/trip-management/thumbnail-reset-result.js';
import type { RecordedTripCommand } from '../../../../api/tests/support/trip-management/commands.js';
import type { ThumbnailDraft } from '../thumbnail/draft-fixture.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';
import { assertOperationBusiness } from './operation-business-result.js';
import { assertOperationView } from './operation-view-result.js';
import type { OperationWait } from './operation-wait.js';

const results: Record<string, string> = {
  建立旅行: '只建立一趟新旅行',
  保存旅行名稱與日期: '保存後的新名稱與日期',
  移至垃圾桶: '旅行只移入一次',
  復原旅行: '原旅行完整回到一般清單',
  永久刪除旅行: '整趟資料完成永久刪除',
  保存新縮圖: '選定圖片為目前縮圖',
  更換縮圖: '新圖片取代原縮圖',
  保存預覽的預設縮圖: '顯示預設縮圖',
  新增支出: '只新增一筆支出',
  修改支出: '原支出更新且帳務正確重算',
  刪除支出: '目標支出移除且帳務正確重算',
  新增分類: '只新增一筆分類',
  修改分類: '原分類顯示新名稱',
  刪除未被引用的分類: '只移除目標分類',
  新增同行者: '只新增一名同行者',
  修改同行者名稱: '原同行者改名且身分保留',
  停用同行者: '原同行者停用且歷史保留',
  啟用同行者: '原同行者恢復可選',
  刪除未被引用的同行者: '只移除目標同行者',
  切換簡化付款: '保存新模式且原始帳務不變',
  記錄獨立還款: '只記錄一筆實際還款',
  保存實付結清: '只保存一次對應實付結果',
};

export async function assertOperationResult(
  page: Page,
  browser: Browser,
  world: LedgerWorld,
  result: string,
): Promise<void> {
  const state = world.get<OperationWait>('loading:operation'),
    ui = managementUI(world);
  expect(result).toBe(results[state.operation]);
  expect(world.get<boolean>('loading:repeatComplete')).toBe(true);
  expect(state.released).toBe(true);
  expect(state.finished).toBe(1);
  expect(state.exchanges.length).toBe(1);
  await waitForManagementReads(ui);
  expect(ui.writes.length).toBe(1);
  const response = await ui.writes[0]!.response();
  expect(response?.status()).toBe(state.status);
  const observed = world.get<{ operationId?: string; id?: string; body: Record<string, unknown> }>(
    'loading:operationRequest',
  );
  const after = await managementSnapshot(world, state.committedTripId);
  expect(after).toEqual(state.after);
  const commandKinds: Record<string, string> = {
    移至垃圾桶: 'move_to_trash',
    復原旅行: 'restore',
    永久刪除旅行: 'purge',
    保存預覽的預設縮圖: 'reset_thumbnail',
  };
  if (commandKinds[state.operation]) {
    const command: RecordedTripCommand = {
      tripId: state.tripId,
      operationId: observed.operationId!,
      kind: commandKinds[state.operation]!,
      method: state.method,
      path: state.path,
      data: observed.body,
      headers: {},
    };
    world.set('management:lastCommand', command);
    if (state.operation === '永久刪除旅行') await assertPurgedTrip(world, response!, command);
    else if (state.operation === '保存預覽的預設縮圖')
      await assertThumbnailReset(world, response!, command);
    else {
      await assertLifecycleTransition(
        world,
        state.operation === '移至垃圾桶' ? 'trash' : 'active',
        response!,
        command,
      );
      await assertPreservedTrip(world, response!);
    }
  } else if (['保存新縮圖', '更換縮圖'].includes(state.operation)) {
    const draft = world.get<ThumbnailDraft>('management:draft');
    world.set('management:thumbnailRequest', {
      tripId: state.tripId,
      operationId: observed.operationId!,
      lifecycleRevision: String(state.before.trips[0]!.lifecycle_revision),
      thumbnailRevision: String(state.before.trips[0]!.thumbnail_revision),
      hashes: [draft.file!.asset.sha256],
    });
    await assertThumbnailSaved(world, response!, state.before);
  } else if (state.operation === '建立旅行') {
    expect(after.trips.length).toBe(1);
    expect(after.trips[0]).toMatchObject({
      id: observed.id,
      owner_id: world.users.get('Alice')!.id,
      name: '京都賞楓',
      start_date: null,
      end_date: null,
      deleted_at: null,
    });
    expect(after.members.length).toBe(1);
    expect(after.members[0]).toMatchObject({
      owner_id: world.users.get('Alice')!.id,
      trip_id: observed.id,
      role: 'owner',
      name: 'Alice',
      is_active: true,
    });
    for (const key of [
      'expenses',
      'shares',
      'repayments',
      'settlements',
      'adjustments',
      'thumbnails',
      'receipts',
    ] as const)
      expect(after[key]).toEqual([]);
    expect(after.reservations.length).toBe(1);
    expect(after.reservations[0]).toMatchObject({
      trip_id: observed.id,
      owner_id: world.users.get('Alice')!.id,
      purged_at: null,
    });
    expect(await managementSnapshot(world, state.tripId)).toEqual(state.before);
    const ids = await world.db.query<{ id: string }>(
      'SELECT id FROM trips WHERE owner_id=$1 ORDER BY id',
      [world.users.get('Alice')!.id],
    );
    expect(ids.rows.map((row) => row.id)).toEqual(
      [state.tripId, world.tripManagement.ids.trips.get('台南旅行')!, observed.id!].sort(),
    );
    const trip = await ownerRead(world, `/api/trips/${observed.id}`);
    expect(trip.status()).toBe(200);
    expect(await trip.json()).toMatchObject({
      id: observed.id,
      name: '京都賞楓',
      hasThumbnail: false,
      expenseCount: 0,
    });
  } else await assertOperationBusiness(world, state, after);
  const sharedBefore =
    world.get<Awaited<ReturnType<typeof sharedSnapshot>>>('management:sharedBefore');
  const sharedAfter = await sharedSnapshot(world);
  if (['新增分類', '修改分類', '刪除未被引用的分類'].includes(state.operation)) {
    expect({
      ...sharedAfter,
      other: { ...sharedAfter.other, categories: sharedBefore.other.categories },
      outsider: { ...sharedAfter.outsider, categories: sharedBefore.outsider.categories },
    }).toEqual(sharedBefore);
  } else expect(sharedAfter).toEqual(sharedBefore);
  if (world.state.has('loading:untouchedTrip')) {
    const untouched = world.get<{ id: string; before: TripManagementSnapshot }>(
      'loading:untouchedTrip',
    );
    expect(await managementSnapshot(world, untouched.id)).toEqual(untouched.before);
  }
  await assertOperationView(browser, page, world, state);
  expect(await sharedSnapshot(world)).toEqual(sharedAfter);
  expect(await managementSnapshot(world, state.committedTripId)).toEqual(after);
  expect(ui.writes.length).toBe(1);
  expect(state.exchanges.length).toBe(1);
  expect(state.errors.map(String)).toEqual([]);
}
