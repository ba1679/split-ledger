import { Then } from '../../../support/fixtures.js';
import { assertCreateFailure } from '../../../support/trips/create-failure-result.js';

Then('旅行未建立且可修正草稿保持', async ({ world }) => {
  await assertCreateFailure(world);
});
