import { When, expect } from '../../../support/fixtures.js';
import { managementSnapshot, sharedSnapshot } from '../../../support/trip-management/baseline.js';
import { ownerRead } from '../../../support/trip-management/preservation.js';

When('owner 讀取 {string} 旅行清單', async ({ world }, list: string) => {
  expect(['一般', '垃圾桶']).toContain(list);
  world.set('management:listScope', list === '一般' ? 'active' : 'trash');
  world.set('management:before', await managementSnapshot(world));
  world.set('management:sharedBefore', await sharedSnapshot(world));
  world.response = await ownerRead(world, list === '一般' ? '/api/trips' : '/api/trips/trash');
  world.set('management:firstPage', await world.response.json());
});
