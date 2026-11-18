import { Then } from '../../../support/fixtures.js';
import { assertLifecycleTransition } from '../../../support/trip-management/lifecycle-result.js';

Then('旅行以同一身分成為垃圾桶', async ({ world }) => {
  await assertLifecycleTransition(world, 'trash');
});
