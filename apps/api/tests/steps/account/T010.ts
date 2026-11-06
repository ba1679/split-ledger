import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T010: exact authoritative backend DSL registration.
When('使用者"乙"將"日本旅行"開始日改為"2027-03-11"', async ({ world }) => {
  await b.request(
    world,
    'PATCH',
    `/api/trips/${b.id(world, 'trip')}`,
    { startDate: '2027-03-11' },
    '乙',
  );
});
