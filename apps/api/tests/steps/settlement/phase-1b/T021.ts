import { Given } from '../../../support/fixtures.js';
import { seedLostSettlementResponse } from '../../../support/splitting/lost-settlement-fixture.js';

Given('Amy 的安排已以 JPY 33 結清但保存回應曾遺失', async ({ world }) => {
  await seedLostSettlementResponse(world);
});
