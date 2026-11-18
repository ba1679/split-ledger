import { Given } from '../../../support/fixtures.js';
import { armCommandFailure } from '../../../support/trip-management/transaction-fault.js';

Given('下一次 {string} 在交易中途會明確失敗', async ({ world }, operation: string) => {
  await armCommandFailure(world, operation);
});
