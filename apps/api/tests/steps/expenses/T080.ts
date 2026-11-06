import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T080: exact authoritative backend DSL registration.
When('使用者"甲"查詢"日本旅行"總額', async ({ world }) => {
  await b.request(world, 'GET', `/api/trips/${b.id(world, 'trip')}/totals`);
});
