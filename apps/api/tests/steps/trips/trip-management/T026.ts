import { Given } from '../../../support/fixtures.js';
import { arrangeAccessActor } from '../../../support/trip-management/access-fixture.js';

Given('旅行請求的存取者為 {string}', async ({ world }, actor: string) => {
  await arrangeAccessActor(world, actor);
});
