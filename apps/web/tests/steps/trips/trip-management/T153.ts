import { Given } from '../../../support/fixtures.js';
import { arrangeCreateResponseLoss } from '../../../support/trips/create-response-loss.js';

Given('建立旅行已送出但原次建立結果尚未確認', async ({ page, world }) => {
  await arrangeCreateResponseLoss(page, world);
});
