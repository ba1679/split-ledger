import { Given } from '../../../support/fixtures.js';
import { arrangeStaleCommand } from '../../../support/trip-management/conflict-fixture.js';

Given('本次旅行命令使用 {string}', async ({ world }, conflict: string) => {
  await arrangeStaleCommand(world, conflict);
});
