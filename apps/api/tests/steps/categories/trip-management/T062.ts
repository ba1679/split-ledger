import { When } from '../../../support/fixtures.js';
import { ownerRead } from '../../../support/trip-management/preservation.js';

When('owner 查詢垃圾桶旅行使用的分類', async ({ world }) => {
  world.response = await ownerRead(world, '/api/categories');
});
