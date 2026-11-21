import { test, expect } from '../fixtures.js';
import { arrangeAnalysisRows } from './arrange.js';
import { analysisSnapshot } from '../../../../api/tests/support/category-analysis/fixture.js';

const rows = [
  {
    項目: '晚餐',
    分類: '餐飲',
    幣別: 'TWD',
    金額: '900',
    付款人: 'Amy',
    分攤者: 'Alice、Amy、Bob',
  },
];
test('T037 browser Given lands on real ledger without analysis prefetch', async ({
  page,
  world,
  analysisViewport,
}) => {
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await expect(page.getByText('晚餐', { exact: true })).toBeVisible();
  expect(world.get('analysis:requests')).toEqual([]);
  expect((await analysisSnapshot(world)).shares).toHaveLength(3);
});
test('T038 browser save appends via SPA without replacing old source', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { appendBrowserAnalysis } = await import('./mutations.js');
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await appendBrowserAnalysis(page, world, [{ ...rows[0]!, 項目: '宵夜', 金額: '300' }]);
  expect((await analysisSnapshot(world)).expenses).toHaveLength(2);
});
test('T039 empty source opens real ledger without fake analysis', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { seedEmptyAnalysis } =
    await import('../../../../api/tests/support/category-analysis/fixture.js');
  const { openAnalysisLedger } = await import('./arrange.js');
  await seedEmptyAnalysis(world);
  await openAnalysisLedger(page, world, analysisViewport);
  expect((await analysisSnapshot(world)).expenses).toEqual([]);
});
test('T040 complete 25 sources land on paged ledger with 20 visible', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { seedPagedAnalysis } =
    await import('../../../../api/tests/support/category-analysis/fixture.js');
  const { openAnalysisLedger } = await import('./arrange.js');
  await seedPagedAnalysis(world, 24, 'TWD', '10', 'TWD', '60');
  await openAnalysisLedger(page, world, analysisViewport);
  await expect(page.locator('.expense-row')).toHaveCount(20);
  expect((await analysisSnapshot(world)).expenses).toHaveLength(25);
});
test('T041 another real trip does not navigate or replace current ledger', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { seedOtherAnalysisTrip } =
    await import('../../../../api/tests/support/category-analysis/fixture.js');
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  const url = page.url();
  await seedOtherAnalysisTrip(world, 'TWD', '900');
  expect(page.url()).toBe(url);
  expect(world.get('analysis:requests')).toEqual([]);
});
test('T042 historical payments persist while browser remains on original ledger', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { seedAnalysisPayments } =
    await import('../../../../api/tests/support/category-analysis/fixture.js');
  await arrangeAnalysisRows(
    page,
    world,
    Array.from({ length: 3 }, (_, i) => ({
      項目: `點心${i}`,
      分類: '餐飲',
      幣別: 'JPY',
      金額: '100',
      付款人: 'Alice',
      分攤者: 'Alice、Amy、Bob',
    })),
    analysisViewport,
  );
  const url = page.url();
  await seedAnalysisPayments(world, 'JPY', '100', 'JPY', '100');
  expect(page.url()).toBe(url);
  expect(world.get('analysis:requests')).toEqual([]);
});
for (const [currency, amount] of [
  ['TWD', '1200'],
  ['USD', '30'],
])
  test(`T043 ${currency} edit saves through SPA form`, async ({
    page,
    world,
    analysisViewport,
  }) => {
    const { saveBrowserAnalysisAmount } = await import('./mutations.js');
    await arrangeAnalysisRows(page, world, rows, analysisViewport);
    await saveBrowserAnalysisAmount(page, world, '晚餐', currency!, amount!);
    expect(world.get('analysis:requests')).toEqual([]);
  });
test('T044 share edit preserves payer/amount and real cached SPA', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { saveBrowserAnalysisShares } = await import('./mutations.js');
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await saveBrowserAnalysisShares(page, world, '晚餐', 'Bob');
  expect((await analysisSnapshot(world)).shares).toHaveLength(1);
});
test('T045 browser confirms deletion and preserves unrelated source', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { deleteBrowserAnalysisExpense } = await import('./mutations.js');
  await arrangeAnalysisRows(
    page,
    world,
    [...rows, { ...rows[0]!, 項目: '保留' }],
    analysisViewport,
  );
  await deleteBrowserAnalysisExpense(page, world, '晚餐');
  expect((await analysisSnapshot(world)).expenses!.map((e) => e.item)).toEqual(['保留']);
});
test('T046 category rename goes through shared UI and preserves stable identity', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { renameBrowserAnalysisCategory } = await import('./mutations.js');
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await renameBrowserAnalysisCategory(page, world, '餐飲', '吃喝');
  expect((await analysisSnapshot(world)).categories![0]).toMatchObject({ name: '吃喝' });
});
test('T047 unclassified edit preserves amount and shares through real UI', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { clearBrowserAnalysisCategory } = await import('./mutations.js');
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await clearBrowserAnalysisCategory(page, world, '晚餐');
  expect((await analysisSnapshot(world)).expenses![0]).toMatchObject({ category_id: null });
});
test('T048 member management UI preserves original historical participant', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { disableBrowserAnalysisMember } = await import('./mutations.js');
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await disableBrowserAnalysisMember(page, world, 'Amy', '小美');
  expect((await analysisSnapshot(world)).shares).toHaveLength(3);
});
for (const state of ['正常', '垃圾桶', '永久刪除', '已復原'])
  test(`T049 ${state} preserves old browser scope for guard`, async ({
    page,
    world,
    analysisViewport,
  }) => {
    const { setAnalysisLifecycle } =
      await import('../../../../api/tests/support/category-analysis/access.js');
    await arrangeAnalysisRows(page, world, rows, analysisViewport);
    const url = page.url();
    await setAnalysisLifecycle(world, state);
    expect(page.url()).toBe(url);
    expect(world.get('analysis:lifecycle')).toBe(state);
  });
for (const viewer of ['擁有者', '未登入', '同名其他帳號'])
  test(`T050 ${viewer} authority changes without clearing cached DOM`, async ({
    page,
    world,
    analysisViewport,
  }) => {
    const { setAnalysisViewer } =
      await import('../../../../api/tests/support/category-analysis/access.js');
    const { login } = await import('../browser.js');
    await arrangeAnalysisRows(page, world, rows, analysisViewport);
    const url = page.url();
    await setAnalysisViewer(world, viewer);
    if (viewer === '同名其他帳號') await login(page, world, 'Amy');
    expect(page.url()).toBe(url);
    await expect(page.getByText('晚餐', { exact: true })).toBeVisible();
  });
for (const device of ['desktop', 'mobile'] as const)
  test.describe(`T051 ${device}`, () => {
    test.use({ analysisViewport: device });
    test('context device has viewport and actual touch support', async ({
      page,
      world,
      analysisViewport,
    }) => {
      const { setAnalysisDevice } = await import('./arrange.js');
      await arrangeAnalysisRows(page, world, rows, analysisViewport);
      const before = await analysisSnapshot(world);
      await setAnalysisDevice(page, world, device === 'mobile' ? '手機' : '桌機');
      expect(page.viewportSize()).toEqual(
        device === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      );
      expect(await analysisSnapshot(world)).toEqual(before);
    });
  });
for (const count of [20, 25])
  test(`T052 loaded ${count} does not alter full DB oracle`, async ({
    page,
    world,
    analysisViewport,
  }) => {
    const { seedPagedAnalysis } =
      await import('../../../../api/tests/support/category-analysis/fixture.js');
    const { openAnalysisLedger, loadAnalysisLedgerCount } = await import('./arrange.js');
    await seedPagedAnalysis(world, 24, 'TWD', '10', 'TWD', '60');
    await openAnalysisLedger(page, world, analysisViewport);
    await loadAnalysisLedgerCount(page, world, count);
  });
test('T059 twelve legal categories include full 30-character name', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { arrangeLongAnalysisRows } = await import('./arrange.js');
  await arrangeLongAnalysisRows(page, world, analysisViewport);
  expect((await analysisSnapshot(world)).expenses).toHaveLength(12);
  expect(world.get('analysis:requests')).toEqual([]);
});

test('T111 F39 empty ledger can append first expense and create a missing category through UI', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { seedEmptyAnalysis } =
    await import('../../../../api/tests/support/category-analysis/fixture.js');
  const { openAnalysisLedger } = await import('./arrange.js');
  const { appendBrowserAnalysis } = await import('./mutations.js');
  await seedEmptyAnalysis(world);
  await openAnalysisLedger(page, world, analysisViewport);
  await appendBrowserAnalysis(page, world, [
    { 項目: '第一筆', 分類: '餐飲', 幣別: 'TWD', 金額: '200', 付款人: 'Alice', 分攤者: 'Alice' },
  ]);
  expect((await analysisSnapshot(world)).expenses).toHaveLength(1);
});
