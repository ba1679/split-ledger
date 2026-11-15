import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import sharp from 'sharp';

const png = await sharp({
  create: { width: 32, height: 24, channels: 4, background: '#168060' },
})
  .png()
  .toBuffer();
const webp = await sharp(png).webp().toBuffer();
const metadata = await sharp(webp).metadata();

assert.equal(metadata.format, 'webp');
assert.equal(metadata.width, 32);
assert.equal(metadata.height, 24);

const app = Fastify();

try {
  await app.register(multipart);
  app.post('/parser-smoke', async (request) => {
    const file = await request.file();

    assert.ok(file);
    assert.equal(file.fieldname, 'image');
    assert.equal(file.mimetype, 'image/png');
    assert.deepEqual(await file.toBuffer(), png);

    return { bytes: png.length };
  });

  const boundary = 'setup-smoke-boundary';
  const response = await app.inject({
    method: 'POST',
    url: '/parser-smoke',
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    payload: Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="smoke.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      png,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]),
  });

  assert.equal(response.statusCode, 200, response.body);
  assert.deepEqual(response.json(), { bytes: png.length });
  const manifest = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
  );

  console.log({
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    sharp: sharp.versions.sharp,
    vips: sharp.versions.vips,
    fastify: app.version,
    multipart: manifest.dependencies['@fastify/multipart'],
    pngBytes: png.length,
    webpBytes: webp.length,
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    parserStatus: response.statusCode,
  });
} finally {
  await app.close();
}
