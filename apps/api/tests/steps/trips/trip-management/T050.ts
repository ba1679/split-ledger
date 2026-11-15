import { Given } from '../../../support/fixtures.js';
import { selectPhoto } from '../../../support/trip-management/photo-fixture.js';

Given('待保存照片含方向與位置資訊且內容為 {string}', async ({ world }, kind: string) => {
  await selectPhoto(world, kind);
});
