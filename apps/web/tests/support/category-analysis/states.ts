import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { analysisSnapshot } from '../../../../api/tests/support/category-analysis/fixture.js';
import { largeAmount, exactEqual } from '../../../../api/tests/support/category-analysis/oracle.js';
import { arrangeAnalysisRows } from './arrange.js';
import type { AnalysisViewport } from './options.js';
import { openConfirmedBrowserAnalysis, analysisUISnapshot } from './page.js';

export async function arrangeConfirmedAnalysisMeal(
  page: Page,
  world: LedgerWorld,
  currency: string,
  personal: string,
  groupCurrency: string,
  group: string,
  viewport: AnalysisViewport = 'desktop',
) {
  expect(currency).toBe(groupCurrency);
  const p = largeAmount(personal),
    g = largeAmount(group);
  expect(exactEqual({ ...p, numerator: String(BigInt(p.numerator) * 2n) }, g)).toBe(true);
  await arrangeAnalysisRows(
    page,
    world,
    [
      {
        項目: '餐點',
        分類: '餐飲',
        幣別: groupCurrency,
        金額: group,
        付款人: 'Alice',
        分攤者: 'Alice、Amy',
      },
    ],
    viewport,
  );
  const body = await openConfirmedBrowserAnalysis(page, world);
  const c = body.currencies.find((c) => c.currencyCode === currency)!;
  expect(exactEqual(c.personal.total, p)).toBe(true);
  expect(exactEqual(c.group.total, g)).toBe(true);
  world.set('analysis:confirmedReply', body);
  world.set('analysis:confirmedSource', await analysisSnapshot(world));
  world.set('analysis:confirmedUI', await analysisUISnapshot(page));
}

export async function addAnalysisFromOtherDevice(
  page: Page,
  world: LedgerWorld,
  currency: string,
  amount: string,
) {
  const { request } = await import('@playwright/test');
  const { analysisContext } =
    await import('../../../../api/tests/support/category-analysis/fixture.js');
  const { randomUUID } = await import('node:crypto');
  const c = analysisContext(world),
    oldUI = await analysisUISnapshot(page),
    id = randomUUID();
  const remote = await request.newContext({
    baseURL: world.origin,
    extraHTTPHeaders: {
      Cookie: world.users.get('Alice')!.cookie,
      Origin: world.get<string>('webOrigin'),
    },
  });
  try {
    const r = await remote.post(`/api/trips/${c.tripId}/expenses`, {
      data: {
        id,
        item: '點心',
        amount,
        currencyCode: currency,
        spentOn: '2027-04-03',
        categoryId: c.categories.get('餐飲'),
        payerMemberId: c.members.get('Amy'),
        shareMemberIds: [c.ownerMemberId, c.members.get('Amy')],
      },
    });
    expect(r.status(), await r.text()).toBe(201);
  } finally {
    await remote.dispose();
  }
  const rows = (await world.db.query('SELECT * FROM expenses WHERE id=$1', [id])).rows;
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    currency_code: currency,
    category_id: c.categories.get('餐飲'),
    payer_member_id: c.members.get('Amy'),
  });
  expect(
    (
      await world.db.query(
        'SELECT member_id FROM expense_shares WHERE expense_id=$1 ORDER BY member_id',
        [id],
      )
    ).rows.map((r) => r.member_id),
  ).toEqual([c.ownerMemberId, c.members.get('Amy')].sort());
  c.expenses.set('點心', id);
  world.set('analysis:source', await analysisSnapshot(world));
  expect(await analysisUISnapshot(page)).toEqual(oldUI);
}

export async function refocusBrowserAnalysis(page: Page) {
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
}

export async function arrangeAnalysisFailure(page: Page, world: LedgerWorld, state: string) {
  expect(['初讀失敗', '背景失敗']).toContain(state);
  const { controlNextAnalysis } = await import('./response.js');
  const control = controlNextAnalysis(world, '失敗');
  if (state === '初讀失敗') {
    const link = page.getByRole('link', { name: '花費分析', exact: true });
    await expect(link, 'Product ledger must expose the approved analysis entry').toBeVisible();
    await link.click();
  } else await refocusBrowserAnalysis(page);
  await expect.poll(() => control.arrived).toBe(true);
  await expect.poll(() => control.finished).toBe(true);
  await expect(page.getByRole('alert').filter({ hasText: /無法|失敗|上次/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /重新嘗試|重新更新|重新載入/ })).toBeEnabled();
  world.set('analysis:failureState', state);
  world.set('analysis:source', await analysisSnapshot(world));
}

export async function setBrowserAnalysisOffline(page: Page, world: LedgerWorld) {
  const source = await analysisSnapshot(world),
    ui = await analysisUISnapshot(page);
  await page.context().setOffline(true);
  world.tripManagement.cleanups.add(async () => {
    if (!page.isClosed()) await page.context().setOffline(false);
  });
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  expect(await analysisSnapshot(world)).toEqual(source);
  expect(await analysisUISnapshot(page)).toEqual(ui);
  world.set('analysis:offline', true);
}
