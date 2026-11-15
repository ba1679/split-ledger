import { Given } from '../../../support/fixtures.js';
import { arrangePendingVerification } from '../../../support/trips/pending-verification.js';

Given('原旅行命令 {string} 查證中且本輪無法確認', async ({ page, world }, operation: string) => {
  await arrangePendingVerification(page, world, operation);
});
