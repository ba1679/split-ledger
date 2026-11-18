import { Then } from '../../../support/fixtures.js';
import { assertRejectedCommand } from '../../../support/trip-management/rejections.js';

Then('命令拒絕為 {string} 且沒有部分變更', async ({ world }, code: string) => {
  await assertRejectedCommand(world, code);
});
