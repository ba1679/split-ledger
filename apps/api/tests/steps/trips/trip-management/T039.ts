import { Then } from '../../../support/fixtures.js';
import { assertSnackOutcome } from '../../../support/trip-management/snack-result.js';

Then('點心保存結果為 {string}', async ({ world }, outcome: string) => {
  await assertSnackOutcome(world, outcome);
});
