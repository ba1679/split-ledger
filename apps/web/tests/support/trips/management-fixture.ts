import { tripEditor } from '../home-navigation.js';
import { expect, test, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  seedLifecycleBaseline,
  managementTripId,
  sharedSnapshot,
} from '../../../../api/tests/support/trip-management/baseline.js';
import { login } from '../browser.js';

export interface ManagementUI {
  page: Page;
  state: string;
  writes: Request[];
  reads: Request[];
  pending: Set<Request>;
  startUrl: string;
  focus: string | null;
}

export function managementUI(world: LedgerWorld): ManagementUI {
  return world.get<ManagementUI>('management:ui');
}

export async function waitForManagementReads(ui: ManagementUI): Promise<void> {
  await expect
    .poll(() => ui.pending.size, {
      timeout: 10000,
      message: 'Initial authoritative API reads must finish before Act',
    })
    .toBe(0);
}

export function observeManagement(page: Page, world: LedgerWorld, state: string): ManagementUI {
  const ui: ManagementUI = {
    page,
    state,
    writes: [],
    reads: [],
    pending: new Set(),
    startUrl: '',
    focus: null,
  };
  const onRequest = (request: Request) => {
    if (!new URL(request.url()).pathname.startsWith('/api/')) return;
    if (request.method() === 'GET') {
      ui.reads.push(request);
      ui.pending.add(request);
    } else if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method()))
      ui.writes.push(request);
  };
  const onFinished = (request: Request) => {
    ui.pending.delete(request);
  };
  page.on('request', onRequest);
  page.on('requestfinished', onFinished);
  page.on('requestfailed', onFinished);
  world.tripManagement.cleanups.add(async () => {
    page.off('request', onRequest);
    page.off('requestfinished', onFinished);
    page.off('requestfailed', onFinished);
  });
  world.set('management:ui', ui);

  return ui;
}

export async function arrangeManagementPage(
  page: Page,
  world: LedgerWorld,
  state: string,
): Promise<void> {
  expect([
    '旅行清單',
    '帳本',
    '垃圾桶',
    '移入確認',
    '永久刪除確認',
    '縮圖編輯',
    '新增表單',
  ]).toContain(state);
  if (test.info().tags.includes('@F006-043')) {
    const title = test.info().title;
    const device = title.includes('桌面電腦')
      ? '桌面電腦'
      : title.includes('手機')
        ? '手機'
        : undefined;
    expect(device, 'The declared device must be selected before Arrange navigation').toBeDefined();
    await page.setViewportSize(
      device === '手機' ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    );
    world.set('management:declaredDevice', device);
  }
  const trash = state === '垃圾桶' || state === '永久刪除確認';
  await seedLifecycleBaseline(world, trash ? '垃圾桶' : '一般可用');
  if (test.info().tags.includes('@F006-043')) {
    // Own and foreign trash exercise a nonempty owner projection while Japan stays active.
    await world.db.query(
      'UPDATE trips SET deleted_at=now(),lifecycle_revision=lifecycle_revision+1 WHERE id=ANY($1::uuid[])',
      [
        [
          world.tripManagement.ids.trips.get('台南旅行'),
          world.tripManagement.ids.trips.get('私人旅行'),
        ],
      ],
    );
    world.set('management:sharedBefore', await sharedSnapshot(world));
  }
  await login(page, world, 'Alice');
  const ui = observeManagement(page, world, state);
  if (trash) {
    await page.goto('/trips/trash');
    await expect(page.getByRole('heading', { name: /垃圾桶/ })).toBeVisible();
    await expect(page.getByText('日本旅行', { exact: true })).toBeVisible();
    if (state === '永久刪除確認')
      await page.getByRole('button', { name: '永久刪除', exact: true }).click();
  } else if (['旅行清單', '新增表單', '移入確認', '縮圖編輯'].includes(state)) {
    await page.goto('/trips');
    await expect(
      page
        .getByRole('link')
        .filter({ has: page.getByRole('heading', { name: '日本旅行', exact: true }) }),
    ).toBeVisible();
    if (state === '新增表單')
      await page.getByRole('button', { name: '新增旅行', exact: true }).click();
    if (state === '移入確認' || state === '縮圖編輯') {
      await tripEditor(page).click();
      await page
        .getByRole('menuitem', {
          name: state === '移入確認' ? '移至垃圾桶' : '更換縮圖',
          exact: true,
        })
        .click();
    }
  } else {
    await page.goto(`/trips/${managementTripId(world)}`);
    await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: '成員淨額', exact: true })).toBeVisible();
    await expect(page.getByText('晚餐', { exact: true })).toBeVisible();
  }
  if (['移入確認', '永久刪除確認', '縮圖編輯', '新增表單'].includes(state))
    await expect(page.getByRole('dialog')).toBeVisible();
  await waitForManagementReads(ui);
  expect(ui.writes, 'Given UI setup must not commit any command').toEqual([]);
  ui.startUrl = page.url();
  ui.focus = await page.evaluate(
    () =>
      document.activeElement?.getAttribute('aria-label') ??
      document.activeElement?.textContent ??
      null,
  );
}
