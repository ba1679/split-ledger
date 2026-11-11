import { test } from '../fixtures.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { fillIndependentRepaymentDraft } from './repayment-draft.js';
import { saveIndependentRepayment } from './save-independent-repayment.js';
import { assertRepaymentFieldValidation } from './repayment-field-validation-result.js';

test('T204: zero repayment preserves the real draft, reserved UUID and all currency accounting', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '代付', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
    { 項目: '台幣代付', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await fillIndependentRepaymentDraft(page, world, 'Alice', '0');
  await saveIndependentRepayment(page, world);
  await assertRepaymentFieldValidation(page, world, 'amount');
});
