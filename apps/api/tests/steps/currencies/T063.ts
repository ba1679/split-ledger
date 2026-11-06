import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T063: exact authoritative backend DSL registration.
Given('系統使用已封存的可用幣別目錄', async ({ world }) => {
  await b.currencySnapshot(world);
});
