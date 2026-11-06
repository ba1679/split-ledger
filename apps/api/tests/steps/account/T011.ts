import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T011: exact authoritative backend DSL registration.
When('使用者"乙"查詢"日本旅行"', async ({ world }) => {
  await b.request(world, 'GET', `/api/trips/${b.id(world, 'trip')}`, undefined, '乙');
});
