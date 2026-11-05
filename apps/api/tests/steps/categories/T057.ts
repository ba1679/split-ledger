import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T057: exact authoritative backend DSL registration.
Then('分類建立因重名被拒絕且原分類不變', async ({ world }) => {
 await b.unchangedCategories(world,409,'CATEGORY_NAME_CONFLICT');
});
