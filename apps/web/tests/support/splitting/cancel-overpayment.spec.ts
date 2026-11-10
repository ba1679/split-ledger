import { test } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { seedBrowserIndependentRepayment } from './independent-repayment-fixture.js';
import { arrangeBrowserOverpaymentWarning } from './overpayment-warning.js';
import { cancelBrowserOverpayment, cancelOverpaymentPhrase } from './cancel-overpayment.js';

test('T165: cancel a genuine pending overpayment once without another write', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '代付', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
    { 項目: '台幣代付', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await seedBrowserIndependentRepayment(world, '400');
  await arrangeBrowserOverpaymentWarning(page, world);
  await runIsolatedStep(
    {
      phrase: cancelOverpaymentPhrase,
      input: undefined,
      execute: (context) => cancelBrowserOverpayment(page, context),
    },
    world,
  );
});
