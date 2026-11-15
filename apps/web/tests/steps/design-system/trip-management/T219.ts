import { When } from '../../../support/fixtures.js';
import { saveLostSettlement } from '../../../support/loading/save-lost-settlement.js';

When('owner 保存本次實付結清', async ({ world }) => {
  await saveLostSettlement(world);
});
