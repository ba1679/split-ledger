import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T058: exact authoritative backend DSL registration.
Then('分類改名因重名被拒絕且原分類與關聯不變', async ({ world }) => {
 await b.unchangedCategories(world,409,'CATEGORY_NAME_CONFLICT');
});
