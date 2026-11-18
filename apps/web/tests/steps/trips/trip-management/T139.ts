import { When } from '../../../support/fixtures.js';
import { rejectSelection } from '../../../support/thumbnail/reject-selection.js';

When('owner 嘗試保存這次不合規選圖', async ({ world }) => {
  await rejectSelection(world);
});
