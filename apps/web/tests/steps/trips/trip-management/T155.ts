import { Then } from '../../../support/fixtures.js';
import { assertCreateUnknown } from '../../../support/trips/create-unknown-result.js';

Then('建立結果未知保留表單照片且只查原旅行', async ({ world }) => {
  await assertCreateUnknown(world);
});
