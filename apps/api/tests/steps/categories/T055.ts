import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T055: exact authoritative backend DSL registration.
Then('分類保存被拒絕且沒有新增分類', async ({ world }) => {
 await b.unchangedCategories(world,400,'VALIDATION_ERROR');
});
