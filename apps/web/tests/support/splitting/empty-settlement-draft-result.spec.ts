import { test, expect } from '../fixtures.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { openAmySettlement } from './open-amy-settlement.js';
import {
  assertEmptySettlementDraft,
  assertEmptySettlementDraftUi,
  emptySettlementDraftPhrase,
} from './empty-settlement-draft-result.js';

test('T213 UI assertions accept blank actual payment and reject formatting or strategy controls', async ({
  page,
}) => {
  expect(emptySettlementDraftPhrase).toBe('應付顯示 JPY 33.33 而實付留空且沒有取整方式選擇');
  const markup = (amount = 'JPY 33.33', value = '', extra = '') =>
    `<main><p>應付金額</p><p>${amount}</p><label>實付金額<input value="${value}"></label>${extra}</main>`;
  await page.setContent(markup());
  await assertEmptySettlementDraftUi(page);
  for (const invalid of [
    markup('JPY 33.333'),
    markup('JPY 33.33（100 ÷ 3）'),
    markup('JPY 33.33', '33'),
    markup('JPY 33.33', '', '<label>取整方式<select><option>四捨五入</option></select></label>'),
    markup('JPY 33.33', '', '<label>方式<select><option>向下</option></select></label>'),
    markup('JPY 33.33', '', '<label><input type="radio">向上</label>'),
  ]) {
    await page.setContent(invalid);
    await expect(assertEmptySettlementDraftUi(page)).rejects.toThrow();
  }
});

test('T213 real product retains the full unpaid arrangement behind a blank payment draft', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await openAmySettlement(page, world);
  await assertEmptySettlementDraft(page, world);
});
