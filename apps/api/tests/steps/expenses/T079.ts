import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T079: exact authoritative backend DSL registration.
Given('使用者"甲"擁有"日本旅行"', async ({ world }) => {
 await b.trip(world);
});
