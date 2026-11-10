import { Given } from '../../../support/fixtures.js';
import { seedOverpaymentWarning } from '../../../support/splitting/overpayment-warning-fixture.js';

export const overpaymentWarningPhrase = 'Amy 應付 JPY 600 且 owner 已取得 JPY 700 的超額警告';

Given(overpaymentWarningPhrase, async ({ world }) => {
  await seedOverpaymentWarning(world);
});
