import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T029: exact authoritative backend DSL registration.
Then('"吃喝"不再可選且既有支出仍存在', async ({ world }) => {
  await b.deletedCategory(world);
});
