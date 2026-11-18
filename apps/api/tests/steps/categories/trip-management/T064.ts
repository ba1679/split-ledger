import { When } from '../../../support/fixtures.js';

When('owner 刪除垃圾桶旅行使用的分類', async ({ world }) => {
  const categoryId = world.get<string>('management:categoryId');

  world.response = await world.api.delete(`/api/categories/${categoryId}`, {
    headers: { cookie: world.users.get('Alice')!.cookie, origin: world.get<string>('webOrigin') },
  });
});
