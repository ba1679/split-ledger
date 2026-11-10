import { test, expect } from '../fixtures.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { openAmySettlement } from './open-amy-settlement.js';
import {
  assertPrefilledSettlementDraft,
  assertPrefilledSettlementDraftUi,
  prefilledSettlementDraftPhrase,
} from './empty-settlement-draft-result.js';

const markup = (amount = 'JPY 33.33', value = '33', extra = '') =>
  `<main><p>應付金額</p><p>${amount}</p><label>實付金額<input value="${value}"></label>${extra}</main>`;

test('T213 UI assertions accept the prefilled actual payment', async ({ page }) => {
  expect(prefilledSettlementDraftPhrase).toBe(
    '應付顯示 JPY 33.33 而實付預填 33 且沒有取整方式選擇',
  );
  await page.setContent(markup());
  await assertPrefilledSettlementDraftUi(page);
});

for (const [index, invalid] of [
  markup('JPY 33.333'),
  markup('JPY 33.33（100 ÷ 3）'),
  markup('JPY 33.33', '34'),
  markup('JPY 33.33', '33', '<label>取整方式<select><option>四捨五入</option></select></label>'),
  markup('JPY 33.33', '33', '<label>方式<select><option>向下</option></select></label>'),
  markup('JPY 33.33', '33', '<label><input type="radio">向上</label>'),
].entries())
  test(`T213 UI assertions reject invalid formatting or strategy control ${index + 1}`, async ({
    page,
  }) => {
    await page.setContent(invalid);
    await expect(assertPrefilledSettlementDraftUi(page)).rejects.toThrow();
  });

test('T213 real product retains the full unpaid arrangement behind an editable prefilled payment draft', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await openAmySettlement(page, world);
  await assertPrefilledSettlementDraft(page, world);
});
