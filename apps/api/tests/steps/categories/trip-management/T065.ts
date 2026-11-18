import { Then, expect } from '../../../support/fixtures.js';
import { ownerRead } from '../../../support/trip-management/preservation.js';
import { assertTrashCategoryUsage } from '../../../support/trip-management/category-result.js';
import { managementSnapshot } from '../../../support/trip-management/baseline.js';

Then('分類因仍被使用而拒絕刪除', async ({ world }) => {
  expect(world.response!.status()).toBe(409);
  expect(await world.response!.json()).toMatchObject({ code: 'CATEGORY_IN_USE' });
  expect(await managementSnapshot(world)).toEqual(world.get('management:before'));
  const list = await ownerRead(world, '/api/categories');

  expect(list.status()).toBe(200);
  await assertTrashCategoryUsage(world, await list.json());
});
