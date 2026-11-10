import type { DataTable } from 'playwright-bdd';
import { Then } from '../../../support/fixtures.js';
import {
  arrangementsScreenPhrase,
  assertArrangementsScreen,
  type ScreenArrangementRow,
} from '../../../support/splitting/arrangements-screen-result.js';

Then(arrangementsScreenPhrase, async ({ page, world }, table: DataTable) => {
  await assertArrangementsScreen(page, world, table.hashes() as unknown as ScreenArrangementRow[]);
});
