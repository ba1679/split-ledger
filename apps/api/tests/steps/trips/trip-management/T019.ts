import { Given } from '../../../support/fixtures.js';
import { retainTrashFor180Days } from '../../../support/trip-management/retention.js';

Given('垃圾桶旅行已保留 180 天且期間未要求永久刪除', async ({ world }) => {
  await retainTrashFor180Days(world);
});
