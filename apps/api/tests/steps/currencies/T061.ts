import { When } from '../../support/fixtures.js';

// T061: exact authoritative backend DSL registration.
When('使用者查詢可用幣別', async ({ world }) => {
  world.response = await world.api.get('/api/currencies');
});
