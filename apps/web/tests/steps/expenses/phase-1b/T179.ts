import { Then } from '../../../support/fixtures.js';
import { assertMigratedFlight } from '../../../support/splitting/migrated-flight-result.js';

Then('機票仍由 Alice 付款且只由 Alice 分攤並保留原始內容與統計', async ({ page, world }) => {
  await assertMigratedFlight(page, world);
});
