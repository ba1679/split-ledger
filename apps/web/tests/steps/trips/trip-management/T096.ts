import { Given } from '../../../support/fixtures.js';
import { arrangeNewTripDraft } from '../../../support/trips/new-trip-fixture.js';

Given('新增旅行草稿的照片為 {string}', async ({ world }, photo: string) => {
  await arrangeNewTripDraft(world, photo);
});
