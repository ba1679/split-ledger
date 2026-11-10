import type { DataTable } from 'playwright-bdd';
import { Given } from '../../../support/fixtures.js';
import { seedSplittingRepayments } from '../../../support/splitting/repayments-fixture.js';

Given('owner 的分帳旅行已有下列獨立還款：', async ({ world }, table: DataTable) => {
  await seedSplittingRepayments(world, table.hashes());
});
