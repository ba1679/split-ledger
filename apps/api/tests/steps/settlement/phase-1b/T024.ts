import { Given } from '../../../support/fixtures.js';
import { seedSimplificationMode } from '../../../support/splitting/simplification-mode-fixture.js';

Given('旅行的簡化付款已為 {string}', async ({ world }, mode: string) => {
  await seedSimplificationMode(world, mode);
});
