import { Then } from '../../../support/fixtures.js';
import { assertLifecycleTransition } from '../../../support/trip-management/lifecycle-result.js';

Then('旅行以同一身分成為一般可用', async ({ world }) => {
  await assertLifecycleTransition(world, 'active');
});
