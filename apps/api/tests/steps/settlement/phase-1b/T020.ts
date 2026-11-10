import { Given } from '../../../support/fixtures.js';
import { seedAmySettledBobOutstanding } from '../../../support/splitting/sequential-settlement-fixture.js';

export const amySettledBobOutstandingPhrase = 'Amy 已以 JPY 33 結清點心安排且 Bob 的安排仍未結清';

Given(amySettledBobOutstandingPhrase, async ({ world }) => {
  await seedAmySettledBobOutstanding(world);
});
