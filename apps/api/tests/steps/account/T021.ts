import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T021: exact authoritative backend DSL registration.
When('使用者查詢目前帳號', async ({ world }) => {
  await b.anonymousAccount(world);
});
