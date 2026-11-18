import { When } from '../../../support/fixtures.js';
import { executeOwnerTripCommand } from '../../../support/trip-management/commands.js';

When('owner 執行旅行命令 {string}', async ({ world }, operation: string) => {
  await executeOwnerTripCommand(world, operation);
});
