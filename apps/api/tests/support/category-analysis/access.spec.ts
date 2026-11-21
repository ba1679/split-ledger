import { test, expect } from '../fixtures.js';
import { seedAnalysisRows, analysisContext } from './fixture.js';
import { setAnalysisLifecycle } from './access.js';

const rows = [
  { 項目: '午餐', 分類: '餐飲', 幣別: 'TWD', 金額: '200', 付款人: 'Alice', 分攤者: 'Alice、Amy' },
];
for (const state of ['正常', '垃圾桶', '永久刪除', '已復原'])
  test(`T020 ${state} via authoritative lifecycle`, async ({ world }) => {
    await seedAnalysisRows(world, rows);
    const id = analysisContext(world).tripId;
    await setAnalysisLifecycle(world, state);
    expect(analysisContext(world).tripId).toBe(id);
  });
for (const viewer of ['擁有者', '未登入', '同名其他帳號'])
  test(`T021 ${viewer} uses real authority`, async ({ world }) => {
    const { setAnalysisViewer } = await import('./access.js');
    await seedAnalysisRows(world, rows);
    await setAnalysisViewer(world, viewer);
    expect(world.get('analysis:viewer')).toBe(
      viewer === '擁有者' ? 'Alice' : viewer === '未登入' ? null : 'Amy',
    );
  });
test('T033 same-name account is not member identity and does not switch owner', async ({
  world,
}) => {
  const { seedSameNameAnalysisAccount } = await import('./access.js');
  await seedAnalysisRows(world, rows);
  await seedSameNameAnalysisAccount(world, 'Amy');
  expect(world.get('analysis:sameNameAccountId')).not.toBe(
    analysisContext(world).members.get('Amy'),
  );
});
