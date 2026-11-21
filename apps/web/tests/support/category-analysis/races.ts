import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { CategoryAnalysisContext } from '../../../../api/tests/support/category-analysis/context.js';
import {
  seedAnalysisRows,
  analysisContext,
  analysisSnapshot,
} from '../../../../api/tests/support/category-analysis/fixture.js';
import { seedExpense } from '../../../../api/tests/support/seed.js';

export async function seedDualAnalysisTrips(
  world: LedgerWorld,
  japanCurrency: string,
  japanAmount: string,
  tainanCurrency: string,
  tainanAmount: string,
) {
  await seedAnalysisRows(world, [
    {
      項目: '日本餐點',
      分類: '餐飲',
      幣別: japanCurrency,
      金額: japanAmount,
      付款人: 'Alice',
      分攤者: 'Alice',
    },
  ]);
  const japan = analysisContext(world);
  await world.db.query("UPDATE trips SET name='日本旅行' WHERE id=$1", [japan.tripId]);
  const e = await seedExpense(world, {
    item: '台南車票',
    owner: 'Alice',
    tripName: '第二旅行',
    currencyCode: tainanCurrency,
    amount: tainanAmount,
    categoryName: '交通',
    spentOn: '2027-04-03',
  });
  await world.db.query("UPDATE trips SET name='台南旅行' WHERE id=$1", [e.trip_id]);
  const member = (
    await world.db.query("SELECT id FROM trip_members WHERE trip_id=$1 AND role='owner'", [
      e.trip_id,
    ])
  ).rows[0].id as string;
  const tainan: CategoryAnalysisContext = {
    tripId: e.trip_id,
    ownerMemberId: member,
    members: new Map([['Alice', member]]),
    categories: new Map([['交通', e.category_id!]]),
    expenses: new Map([['台南車票', e.id]]),
  };
  expect(japan.tripId).not.toBe(tainan.tripId);
  world.set('analysis:japanContext', japan);
  world.set('analysis:tainanContext', tainan);
  world.set('analysis:japanSource', await analysisSnapshot(world));
  world.set('analysis:context', tainan);
  world.set('analysis:tainanSource', await analysisSnapshot(world));
  world.set('analysis:context', japan);
}

export async function arrangePendingJapanAnalysis(
  page: Page,
  world: LedgerWorld,
  viewport: import('./options.js').AnalysisViewport = 'desktop',
) {
  const { openAnalysisLedger } = await import('./arrange.js');
  const { controlNextAnalysis } = await import('./response.js');
  world.set('analysis:context', world.get('analysis:japanContext'));
  await openAnalysisLedger(page, world, viewport);
  const control = controlNextAnalysis(world, '延遲成功');
  world.set('analysis:japanControl', control);
  const link = page.getByRole('link', { name: '花費分析', exact: true });
  await expect(link, 'Product ledger must expose the approved analysis entry').toBeVisible();
  await link.click();
  await expect.poll(() => control.arrived).toBe(true);
  expect(control.finished).toBe(false);
  expect(control.status).toBe(200);
}

export function arrangePendingTainanAnalysis(world: LedgerWorld) {
  const tainan = world.get<CategoryAnalysisContext>('analysis:tainanContext');

  return import('./response.js').then(({ controlNextAnalysis }) => {
    const control = controlNextAnalysis(world, '延遲成功', tainan.tripId!);
    world.set('analysis:tainanControl', control);
    expect(control.arrived).toBe(false);

    return control;
  });
}

export async function navigateTainanLedger(page: Page, world: LedgerWorld) {
  const mobile = page.getByRole('navigation', { name: '行動導覽', exact: true });
  if (await mobile.isVisible()) {
    await mobile.getByRole('button', { name: '我的旅行', exact: true }).click();
    await page
      .getByRole('dialog', { name: '我的旅行', exact: true })
      .getByRole('link', { name: '旅行清單', exact: true })
      .click();
  } else
    await page
      .getByRole('navigation', { name: '主要導覽', exact: true })
      .getByRole('link', { name: '我的旅行', exact: true })
      .click();
  const tainan = world.get<CategoryAnalysisContext>('analysis:tainanContext');
  await page.locator(`a.trip-card[href="/trips/${tainan.tripId}"]`).click();
  world.set('analysis:context', tainan);
  await expect(page.getByRole('heading', { name: '台南旅行', exact: true })).toBeVisible();
}

export async function arrangeTainanWithPendingJapan(
  page: Page,
  world: LedgerWorld,
  viewport: import('./options.js').AnalysisViewport = 'desktop',
) {
  await arrangePendingJapanAnalysis(page, world, viewport);
  await navigateTainanLedger(page, world);
  const { openConfirmedBrowserAnalysis } = await import('./page.js');
  await openConfirmedBrowserAnalysis(page, world);
  expect(
    world.get<import('./response.js').AnalysisReadControl>('analysis:japanControl').finished,
  ).toBe(false);
}
