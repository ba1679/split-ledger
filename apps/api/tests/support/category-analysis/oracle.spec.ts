import { test } from '../fixtures.js';
import { seedAnalysisRows } from './fixture.js';
import { readAnalysis } from './read.js';
import { assertAnalysisCategories } from './oracle.js';

test('T024 complete category oracle reaches real product response', async ({ world }) => {
  await seedAnalysisRows(world, [
    {
      項目: '點心',
      分類: '餐飲',
      幣別: 'JPY',
      金額: '100',
      付款人: 'Alice',
      分攤者: 'Alice、Amy、Bob',
    },
  ]);
  await readAnalysis(world);
  assertAnalysisCategories(world, '個人', 'JPY', [{ 分類: '餐飲', 金額: '100/3' }]);
});
test('T025 total and complete currency set use DB oracle', async ({ world }) => {
  const { assertAnalysisTotals } = await import('./oracle.js');
  await seedAnalysisRows(world, [
    {
      項目: '晚餐',
      分類: '餐飲',
      幣別: 'TWD',
      金額: '900',
      付款人: 'Amy',
      分攤者: 'Alice、Amy、Bob',
    },
  ]);
  await readAnalysis(world);
  assertAnalysisTotals(world, [{ 幣別: 'TWD', 個人: '300', 團體: '900' }]);
});
test('T026 currency order includes other-only zero charts', async ({ world }) => {
  const { assertAnalysisCurrencies } = await import('./oracle.js');
  await seedAnalysisRows(world, [
    { 項目: '他人', 分類: '餐飲', 幣別: 'USD', 金額: '10', 付款人: 'Bob', 分攤者: 'Bob' },
  ]);
  await readAnalysis(world);
  assertAnalysisCurrencies(world, 'USD');
});
test('T027 zero chart uses canonical amount and no positive categories', async ({ world }) => {
  const { assertAnalysisZero } = await import('./oracle.js');
  await seedAnalysisRows(world, [
    { 項目: '他人', 分類: '餐飲', 幣別: 'USD', 金額: '10', 付款人: 'Bob', 分攤者: 'Bob' },
  ]);
  await readAnalysis(world);
  assertAnalysisZero(world, '個人', 'USD');
  assertAnalysisZero(world, '團體', 'USD');
});
test('T028 shared flag includes non-owner members across currencies', async ({ world }) => {
  const { assertAnalysisShared } = await import('./oracle.js');
  await seedAnalysisRows(world, [
    { 項目: '他人共同', 分類: '餐飲', 幣別: 'USD', 金額: '20', 付款人: 'Bob', 分攤者: 'Amy、Bob' },
  ]);
  await readAnalysis(world);
  assertAnalysisShared(world, '有');
});
test('T029 genuine empty trip is successful empty analysis', async ({ world }) => {
  const { seedEmptyAnalysis } = await import('./fixture.js');
  const { assertAnalysisEmpty } = await import('./oracle.js');
  await seedEmptyAnalysis(world);
  await readAnalysis(world);
  assertAnalysisEmpty(world);
});
test('T031 shared maximum historical precision applies to every chart amount', async ({
  world,
}) => {
  const { seedHistoricalAnalysis } = await import('./fixture.js');
  const { assertAnalysisPrecision } = await import('./oracle.js');
  await seedHistoricalAnalysis(world, 2, 'TWD', '1.01', 3, 'TWD', '0.001');
  await readAnalysis(world);
  assertAnalysisPrecision(world, 'TWD', 3);
});
test('T032 complete read-only source comparison covers repayments and settlements', async ({
  world,
}) => {
  const { seedAnalysisPayments } = await import('./fixture.js');
  const { assertAnalysisReadOnly } = await import('./oracle.js');
  await seedAnalysisRows(
    world,
    Array.from({ length: 3 }, (_, i) => ({
      項目: `點心${i}`,
      分類: '餐飲',
      幣別: 'JPY',
      金額: '100',
      付款人: 'Alice',
      分攤者: 'Alice、Amy、Bob',
    })),
  );
  await seedAnalysisPayments(world, 'JPY', '100', 'JPY', '100');
  await readAnalysis(world);
  assertAnalysisReadOnly(world);
});
test('T034 individual target is owner role member, not user or same-name account', async ({
  world,
}) => {
  const { seedSameNameAnalysisAccount } = await import('./access.js');
  const { assertAnalysisOwner } = await import('./oracle.js');
  await seedAnalysisRows(world, [
    {
      項目: '午餐',
      分類: '餐飲',
      幣別: 'TWD',
      金額: '900',
      付款人: 'Amy',
      分攤者: 'Alice、Amy、Bob',
    },
  ]);
  await seedSameNameAnalysisAccount(world, 'Amy');
  await readAnalysis(world);
  assertAnalysisOwner(world);
});
test('T035 historic shares remain eligible after member rename and disable', async ({ world }) => {
  const { disableAnalysisMember } = await import('./mutations.js');
  const { assertAnalysisHistoricalShares } = await import('./oracle.js');
  await seedAnalysisRows(world, [
    {
      項目: '午餐',
      分類: '餐飲',
      幣別: 'TWD',
      金額: '900',
      付款人: 'Amy',
      分攤者: 'Alice、Amy、Bob',
    },
  ]);
  await disableAnalysisMember(world, 'Amy', '小美');
  await readAnalysis(world);
  assertAnalysisHistoricalShares(world, '午餐');
});
for (const [state, viewer, reason] of [
  ['正常', '未登入', '未登入'],
  ['垃圾桶', '擁有者', '垃圾桶'],
  ['正常', '同名其他帳號', '不存在'],
  ['永久刪除', '擁有者', '不存在'],
] as const)
  test(`T036 ${state}/${viewer} rejects without disclosure or source changes`, async ({
    world,
  }) => {
    const { setAnalysisLifecycle, setAnalysisViewer } = await import('./access.js');
    const { assertAnalysisDenied } = await import('./oracle.js');
    await seedAnalysisRows(world, [
      {
        項目: '午餐',
        分類: '餐飲',
        幣別: 'TWD',
        金額: '200',
        付款人: 'Alice',
        分攤者: 'Alice、Amy',
      },
    ]);
    await setAnalysisLifecycle(world, state);
    await setAnalysisViewer(world, viewer);
    await readAnalysis(world, world.get<string | null>('analysis:viewer'));
    assertAnalysisDenied(world, reason);
  });
