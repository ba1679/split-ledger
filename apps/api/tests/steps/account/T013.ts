import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T013: exact authoritative backend DSL registration.
Given('使用者"甲"在手機工作階段擁有"日本旅行"', async ({ world }) => {
 await b.trip(world);
 await b.prepareSecondDevice(world);
});
