import { Then, expect } from '../../support/fixtures.js';
import { rows, assertUnclassified } from '../../support/accounts-categories-trips.js';
import type { Row } from '../../support/accounts-categories-trips.js';

Then('該筆支出沒有分類', async ({ page, world }) => {
  await assertUnclassified(page, world);
  expect(await rows(world, 'expenses')).toHaveLength(world.get<Row[]>('expense:before').length + 1);
});
