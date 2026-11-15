import { Then } from '../../../support/fixtures.js';
import { assertUnknownOutcome } from '../../../support/trips/unknown-result.js';

Then('結果未確認並保留原操作的查證出口', async ({ world }) => {
  await assertUnknownOutcome(world);
});
