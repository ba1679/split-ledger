import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T076: exact authoritative backend DSL registration.
When('使用者"甲"在電腦工作階段查詢"日本旅行"支出', async ({ world }) => {
  await b.secondDevice(world, `/api/trips/${b.id(world, 'trip')}/expenses`);
});
