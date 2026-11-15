import { Given } from '../../../support/fixtures.js';
import { armCreateFailure } from '../../../support/trips/create-failure-fixture.js';

Given('旅行建立將明確失敗', async ({ world }) => {
  await armCreateFailure(world);
});
