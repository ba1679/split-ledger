import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T101: exact authoritative backend DSL registration.
When('使用者"甲"將"日本旅行"結束日改為"2027-03-09"', async ({ world }) => {
 await b.request(world,'PATCH',`/api/trips/${b.id(world,'trip')}`,{endDate:'2027-03-09'});
});
