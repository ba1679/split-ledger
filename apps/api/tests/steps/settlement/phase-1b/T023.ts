import { Given } from '../../../support/fixtures.js';
import { seedPaymentHistorySources } from '../../../support/splitting/history-reconstruction-fixture.js';

export const paymentHistorySourcesPhrase = '旅行有既有實付與結清調整的分帳來源';

Given(paymentHistorySourcesPhrase, async ({ world }) => {
  await seedPaymentHistorySources(world);
});
