import { Given, expect } from '../../../support/fixtures.js';
import {
  selectExactImage,
  type UploadImage,
} from '../../../support/trip-management/generated-images.js';

Given('本次保存包含兩張各自合法圖片', async ({ world }) => {
  await selectExactImage(world, 'JPEG .jpg', 65536, 64, 48);
  const first = world.get<UploadImage[]>('management:uploadFiles');

  await selectExactImage(world, 'JPEG .jpeg', 65536, 48, 64);
  const second = world.get<UploadImage[]>('management:uploadFiles');

  expect(first[0]!.asset.sha256).not.toBe(second[0]!.asset.sha256);
  world.set('management:uploadFiles', [...first, ...second]);
});
