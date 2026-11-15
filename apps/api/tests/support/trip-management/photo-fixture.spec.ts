import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { makePhoto } from './photo-fixture.js';

for (const kind of ['直拍照片', '複雜照片', '小圖']) {
  test(`photo fixture ${kind} has real EXIF/GPS/ICC and independent display oracle`, async () => {
    const { bytes, expected } = await makePhoto(kind);
    const metadata = await sharp(bytes).metadata();

    expect(metadata.icc?.length).toBeGreaterThan(0);
    expect(metadata.orientation).toBe(kind === '直拍照片' ? 6 : 1);
    const exif = metadata.exif!;
    const start = exif.indexOf(Buffer.from([0x49, 0x49, 42, 0]));

    expect(start).toBeGreaterThanOrEqual(0);
    const tiff = exif.subarray(start);
    const ifd = tiff.readUInt32LE(4);
    let gps = 0;
    for (let index = 0; index < tiff.readUInt16LE(ifd); index++) {
      const entry = ifd + 2 + index * 12;

      if (tiff.readUInt16LE(entry) === 0x8825) gps = tiff.readUInt32LE(entry + 8);
    }
    expect(gps).toBeGreaterThan(0);
    expect(tiff.readUInt16LE(gps)).toBe(5);
    const latPointer = tiff.readUInt32LE(gps + 2 + 2 * 12 + 8),
      lonPointer = tiff.readUInt32LE(gps + 2 + 4 * 12 + 8);

    expect(tiff.readUInt32LE(latPointer)).toBe(25);
    expect(tiff.readUInt32LE(lonPointer)).toBe(121);
    if (kind === '直拍照片' || kind === '小圖') {
      const { data, info } = await sharp(bytes)
        .rotate()
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      expect(info).toMatchObject({ width: expected.width, height: expected.height, channels: 4 });
      if (expected.corners) {
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
            ).toBeLessThanOrEqual(20);
      } else expect(data[3]).toBe(128);
    }
  });
}
