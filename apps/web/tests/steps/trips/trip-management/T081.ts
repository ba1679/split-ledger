import { isCancelledRead } from '../../../support/loading/query-attempts.js';
import { Then, expect } from '../../../support/fixtures.js';
import { managementUI, waitForManagementReads } from '../../../support/trips/management-fixture.js';
import {
  managementSnapshot,
  managementTripId,
  sharedSnapshot,
} from '../../../../../api/tests/support/trip-management/baseline.js';
import { expectedOwnerList } from '../../../../../api/tests/support/trip-management/lists.js';

Then('垃圾桶導覽可達且不冒用旅行內導覽', async ({ world }) => {
  const ui = managementUI(world);
  const { page } = ui;
  const device = world.get<string>('management:trashNavigationDevice');

  await expect(page).toHaveURL(/\/trips\/trash$/);
  await expect(page.getByRole('heading', { name: '垃圾桶', exact: true })).toBeVisible();
  await waitForManagementReads(ui);
  await expect(page.getByText('台南旅行', { exact: true })).toBeVisible();
  await expect(page.getByText('私人旅行', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '同行者', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '分帳結算', exact: true })).toHaveCount(0);
  const navigation = page.getByRole('navigation', {
    name: device === '手機' ? '行動導覽' : '主要導覽',
    exact: true,
  });

  await expect(navigation.locator('[aria-current]:not([aria-current="false"])')).toHaveCount(1);
  const reads = ui.reads.filter(
    (request) => new URL(request.url()).pathname === '/api/trips/trash',
  );

  expect(reads.length).toBeGreaterThan(0);
  expect(reads.filter((request) => !isCancelledRead(request)).length).toBeGreaterThan(0);
  for (const request of reads) {
    if (isCancelledRead(request)) continue;
    const response = await request.response();

    expect(response?.status()).toBe(200);
    expect((await response!.json()).items).toEqual(await expectedOwnerList(world, 'trash'));
  }
  for (const request of ui.reads)
    expect(new URL(request.url()).pathname).not.toMatch(
      /^\/api\/trips\/trash\/(?:members|settlement|repayments|expenses|totals)(?:\/|$)/,
    );
  // Read an active trip in a separate page: its existing navigation must remain intact.
  const otherPage = await page.context().newPage();
  const extraWrites: string[] = [];
  otherPage.on('request', (request) => {
    if (
      new URL(request.url()).pathname.startsWith('/api/') &&
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())
    )
      extraWrites.push(request.url());
  });
  try {
    await otherPage.setViewportSize(page.viewportSize()!);
    await otherPage.goto(`/trips/${managementTripId(world)}/members`);
    const nav = otherPage.getByRole('navigation', {
      name: device === '手機' ? '行動導覽' : '主要導覽',
      exact: true,
    });
    const member = nav.getByRole('link', { name: '同行者', exact: true });

    await expect(member).toBeVisible();
    await expect(member).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: '分帳結算', exact: true })).toBeVisible();
    await expect(nav.locator('[aria-current]:not([aria-current="false"])')).toHaveCount(1);
    if (device === '手機') {
      await expect(nav.locator('a:visible,button:visible')).toHaveText([
        '我的旅行',
        '同行者',
        '分帳結算',
        '支出分類',
        '登出',
      ]);
    } else {
      const group = nav.locator('.trip-nav-group');
      await expect(group.getByRole('link', { name: '我的旅行', exact: true })).toBeVisible();
      await expect(
        group.locator('.trip-subnav').getByRole('link', { name: '同行者', exact: true }),
      ).toBeVisible();
      const parent = await group.getByRole('link', { name: '我的旅行', exact: true }).boundingBox();
      const child = await member.boundingBox();
      expect(child!.x).toBeGreaterThan(parent!.x + 8);
    }
    expect(extraWrites).toEqual([]);
  } finally {
    await otherPage.close();
  }
  expect(ui.writes).toEqual([]);
  expect(await managementSnapshot(world)).toEqual(world.get('management:before'));
  expect(await sharedSnapshot(world)).toEqual(world.get('management:sharedBefore'));
});
