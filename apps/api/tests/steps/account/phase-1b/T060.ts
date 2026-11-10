import { Then } from '../../../support/fixtures.js';
import { assertUnauthorizedSplittingRejection } from '../../../support/splitting/unauthorized-rejection.js';

Then('分帳資源拒絕存取且不揭露帳務', async ({ world }) => {
  await assertUnauthorizedSplittingRejection(world);
});
