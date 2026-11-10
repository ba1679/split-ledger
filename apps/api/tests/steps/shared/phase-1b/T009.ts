import { Then } from '../../../support/fixtures.js';
import { assertRejectedSplittingOperation } from '../../../support/splitting/rejection.js';

Then('這次分帳操作被拒絕為 {string}', async ({ world }, code: string) => {
  await assertRejectedSplittingOperation(world, code);
});
