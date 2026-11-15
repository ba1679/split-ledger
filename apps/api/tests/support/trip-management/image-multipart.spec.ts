import { test, expect } from '@playwright/test';
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { withImageAssets } from './image-assets.js';
import { generateExactImage, type UploadImage } from './generated-images.js';
import { imageMultipart } from './thumbnail-request.js';

test('multipart fixture transmits two distinct valid JPEGs under repeated image part names', async () => {
  await withImageAssets(async (workspace) => {
    const files: UploadImage[] = [];
    for (const [width, height] of [
      [64, 48],
      [48, 64],
    ]) {
      const bytes = await generateExactImage('JPEG .jpg', 65536, width!, height!);
      const name = `${files.length}.jpg`;

      files.push({
        bytes,
        name,
        mimeType: 'image/jpeg',
        asset: await workspace.write(name, bytes),
      });
    }
    const app = Fastify();

    try {
      await app.register(multipart, { limits: { files: 2, parts: 2, fields: 0, fileSize: 65536 } });
      app.post('/inspect', async (request) => {
        let count = 0;
        for await (const part of request.parts()) {
          expect(part.type).toBe('file');
          if (part.type !== 'file') throw new Error('Expected a real file part');
          expect(part.fieldname).toBe('image');
          expect(part.mimetype).toBe('image/jpeg');
          expect(part.filename).toBe(files[count]!.name);
          expect(await part.toBuffer()).toEqual(files[count]!.bytes);
          count++;
        }

        return { count };
      });
      const response = await app.inject({
        method: 'POST',
        url: '/inspect',
        headers: { 'content-type': 'multipart/form-data; boundary=real-parts' },
        payload: imageMultipart(files, 'real-parts'),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ count: 2 });
    } finally {
      await app.close();
    }
  });
});
