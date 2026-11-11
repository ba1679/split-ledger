import { Given } from '../../../support/fixtures.js';
import { captureCurrentAmyArrangement } from '../../../support/splitting/current-arrangement-fixture.js';

Given('owner 已取得 Amy 向 Alice 的目前付款安排', async ({ world }) => {
  await captureCurrentAmyArrangement(world);
});
