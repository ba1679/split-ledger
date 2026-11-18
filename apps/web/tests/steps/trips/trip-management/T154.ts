import { When } from '../../../support/fixtures.js';
import { releaseCreateResponseLoss } from '../../../support/trips/create-response-loss.js';

When('站內處理原次建立的遺失回應', async ({ world }) => {
  await releaseCreateResponseLoss(world);
});
