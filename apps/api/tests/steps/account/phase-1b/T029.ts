import { When } from '../../../support/fixtures.js';
import { requestUnauthorizedSplittingResource } from '../../../support/splitting/unauthorized-operation.js';

When('非 owner 帳號嘗試 {string} 分帳資源', async ({ world }, operation: string) => {
  await requestUnauthorizedSplittingResource(world, operation);
});
