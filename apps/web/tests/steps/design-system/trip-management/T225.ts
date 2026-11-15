import { When } from '../../../support/fixtures.js';
import { recheckSettlement } from '../../../support/loading/recheck-settlement.js';

When('owner 再次查證原實付', async ({ world }) => {
  await recheckSettlement(world);
});
