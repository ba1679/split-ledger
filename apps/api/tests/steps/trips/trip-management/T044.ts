import { Given } from '../../../support/fixtures.js';
import { selectExactImage } from '../../../support/trip-management/generated-images.js';

Given(
  '待保存圖片為 {string}、{int} bytes、{int} x {int} px',
  async ({ world }, format: string, size: number, width: number, height: number) => {
    await selectExactImage(world, format, size, width, height);
  },
);
