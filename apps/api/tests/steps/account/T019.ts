import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T019: exact authoritative backend DSL registration.
Given('使用者"甲"的"日本旅行"開始日為"2027-03-10"且使用者"乙"已登入', async ({ world }) => {
 await b.otherAccountTrip(world, '2027-03-10');
});
