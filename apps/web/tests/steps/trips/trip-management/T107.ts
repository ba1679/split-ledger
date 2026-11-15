import { Given } from '../../../support/fixtures.js';
import { arrangeResolvedCreateFailure } from '../../../support/trips/create-failure-fixture.js';

Given('前次建立明確失敗已解除且照片草稿保留', async ({ world }) => {
  await arrangeResolvedCreateFailure(world);
});
