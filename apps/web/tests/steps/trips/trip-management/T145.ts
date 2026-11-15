import { When } from '../../../support/fixtures.js';
import type { UploadImage } from '../../../../../api/tests/support/trip-management/generated-images.js';
import { savePreparedFile } from '../../../support/thumbnail/save-prepared-file.js';

When('owner 選圖預覽後保存該照片', async ({ world }) => {
  const { file } = world.get<{ file: UploadImage }>('management:formatPhoto');
  await savePreparedFile(world, file);
});
