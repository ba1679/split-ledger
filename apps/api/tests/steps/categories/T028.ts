import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T028: exact authoritative backend DSL registration.
Then('"交通"分類屬於使用者"甲"', async ({ world }) => {
  await b.ownTransportCategory(world);
});
