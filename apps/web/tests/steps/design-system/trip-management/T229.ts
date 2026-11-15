import { When } from '../../../support/fixtures.js';
import { openTrashByKeyboard } from '../../../support/loading/keyboard-trash.js';

When('owner 以鍵盤開啟移至垃圾桶確認', async ({ world }) => {
  await openTrashByKeyboard(world);
});
