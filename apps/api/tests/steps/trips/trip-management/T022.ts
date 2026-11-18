import { Given } from '../../../support/fixtures.js';
import { arrangeFailedCommandThenRelease } from '../../../support/trip-management/retry-fixture.js';

Given('前次 {string} 已明確失敗且故障已解除', async ({ world }, operation: string) => {
  await arrangeFailedCommandThenRelease(world, operation);
});
