import { Then, expect } from '../../../support/fixtures.js';
import sharp from 'sharp';
import type { PhotoExpectation } from '../../../support/trip-management/photo-fixture.js';
import { assertThumbnailSaved } from '../../../support/trip-management/thumbnail-result.js';
import { managementSnapshot } from '../../../support/trip-management/baseline.js';

Then('保存結果為去除原始資訊的有界縮圖', async ({ world }) => {
  await assertThumbnailSaved(world);
  const expected = world.get<PhotoExpectation>('management:photoExpectation');
  const after = await managementSnapshot(world);
  const image = after.thumbnails[0]!;
  const bytes = image.image_webp as Buffer;
  const metadata = await sharp(bytes).metadata();

  expect(metadata.format).toBe('webp');
  expect(metadata.space).toBe('srgb');
  expect(metadata.width).toBe(expected.width);
  expect(metadata.height).toBe(expected.height);
  expect(metadata.width).toBeLessThanOrEqual(1200);
  expect(metadata.height).toBeLessThanOrEqual(1200);
  for (const value of [
    metadata.exif,
    metadata.icc,
    metadata.xmp,
    metadata.iptc,
    metadata.orientation,
  ])
    expect(
      value,
      'Original location, orientation and source profiles must not persist',
    ).toBeUndefined();
  expect(Object.keys(image).sort()).toEqual(
    ['owner_id', 'trip_id', 'image_webp', 'width', 'height', 'updated_at'].sort(),
  );
  if (expected.corners || expected.alpha !== undefined) {
    const { data, info } = await sharp(bytes)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    expect(info.channels).toBe(4);
    if (expected.corners)
      for (const [index, [x, y]] of [
        [6, 6],
        [info.width - 7, 6],
        [6, info.height - 7],
        [info.width - 7, info.height - 7],
      ].entries())
        for (let channel = 0; channel < 3; channel++)
          expect(
            Math.abs(
              data[(y! * info.width + x!) * 4 + channel]! - expected.corners[index]![channel]!,
            ),
            'Orientation and edge markers must survive without cropping',
          ).toBeLessThanOrEqual(20);
    if (expected.alpha !== undefined) {
      expect(metadata.hasAlpha).toBe(true);
      expect(Math.abs(data[3]! - expected.alpha)).toBeLessThanOrEqual(1);
      for (const [index, value] of [67, 140, 161].entries())
        expect(
          Math.abs(data[index]! - value),
          'Small-image colour must not be premultiplied or flattened',
        ).toBeLessThanOrEqual(20);
    }
  }
  expect(await managementSnapshot(world)).toEqual(after);
});
