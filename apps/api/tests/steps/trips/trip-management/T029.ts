import { Given } from '../../../support/fixtures.js';
import { arrangeCommittedOriginal } from '../../../support/trip-management/receipt-fixture.js';

Given(
  '原次 {string} 已成功但回應遺失，目前為 {string}',
  async ({ world }, operation: string, current: string) => {
    await arrangeCommittedOriginal(world, operation, current);
  },
);
