import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T054: exact authoritative backend DSL registration.
Then('分類保存成功且識別不變', async ({ world }) => {
  await b.sameCategory(world);
});
