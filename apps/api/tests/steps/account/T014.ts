import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T014: exact authoritative backend DSL registration.
When('使用者"甲"在電腦工作階段查詢旅行清單', async ({ world }) => {
 await b.secondDevice(world, '/api/trips');
});
