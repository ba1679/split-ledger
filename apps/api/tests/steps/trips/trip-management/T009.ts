import { Given } from '../../../support/fixtures.js';
import { seedLifecycleBaseline } from '../../../support/trip-management/baseline.js';

Given('旅行生命週期基準為 {string}', async ({ world }, state: string) => {
  await seedLifecycleBaseline(world, state);
});
