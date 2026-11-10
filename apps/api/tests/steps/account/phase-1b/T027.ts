import { When } from '../../../support/fixtures.js';
import { requestCrossTripChild } from '../../../support/splitting/cross-trip-operation.js';

When('owner 以目前旅行路徑 {string} 另一旅行子資源', async ({ world }, operation: string) => {
  await requestCrossTripChild(world, operation);
});
