import { When } from '../../../support/fixtures.js';
import type { UploadImage } from '../../../../../api/tests/support/trip-management/generated-images.js';
import { savePreparedFile } from '../../../support/thumbnail/save-prepared-file.js';

When('owner 改選合法JPEG並保存縮圖', async ({ world }) => {
  const { file } = world.get<{ file: UploadImage }>('management:selectionRetry');
  await savePreparedFile(world, file);
});
