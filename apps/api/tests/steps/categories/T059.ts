import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T059: exact authoritative backend DSL registration.
Then('分類改名被拒絕且原分類不變', async ({ world }) => {
  await b.unchangedCategories(world, 400, 'VALIDATION_ERROR');
});
