import { Given } from '../../../support/fixtures.js';
import { seedStaleOverpaymentWarning } from '../../../support/splitting/stale-warning-fixture.js';

export const staleOverpaymentWarningPhrase = '超額警告後旅行已有新的帳務版本';

Given(staleOverpaymentWarningPhrase, async ({ world }) => {
  await seedStaleOverpaymentWarning(world);
});
