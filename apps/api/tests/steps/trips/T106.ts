import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T106: exact authoritative backend DSL registration.
Given('使用者"甲"的"日本旅行"開始日為"2027-03-10"且結束日未填', async ({ world }) => {
 await b.trip(world,'日本旅行',{startDate:'2027-03-10'});
});
