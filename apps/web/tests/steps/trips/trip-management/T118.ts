import { Given } from '../../../support/fixtures.js';
import { arrangeStaleLink } from '../../../support/trips/stale-link-fixture.js';

Given(
  '旅行已在另一裝置成為 {string} 且本裝置保留舊帳本',
  async ({ page, world, browser }, state: string) => {
    await arrangeStaleLink(page, world, browser, state);
  },
);
