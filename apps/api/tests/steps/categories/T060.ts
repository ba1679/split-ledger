import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T060: exact authoritative backend DSL registration.
Then('午餐仍在"日本旅行"且沒有分類', async ({ world }) => {
 await b.clearedCategory(world);
});
