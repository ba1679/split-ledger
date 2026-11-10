import { Given } from '../../../support/fixtures.js';
import { seedCrossTripSplittingResources } from '../../../support/splitting/cross-trip-fixture.js';

Given('同一owner的另一趟旅行有可讀寫分帳子資源', async ({ world }) => {
  await seedCrossTripSplittingResources(world);
});
