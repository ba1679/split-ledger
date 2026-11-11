import { When } from '../../../support/fixtures.js';
import { deleteSharedDinner } from '../../../support/splitting/delete-dinner-command.js';

When('owner 刪除共同晚餐支出', async ({ world }) => {
  await deleteSharedDinner(world);
});
