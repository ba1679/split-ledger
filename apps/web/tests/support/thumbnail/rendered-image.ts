import { expect, type Locator } from '@playwright/test';

export async function renderedImage(image: Locator) {
  await expect(image).toBeVisible();

  return image.evaluate(async (element) => {
    if (!(element instanceof HTMLImageElement)) throw new Error('Expected a real rendered image');
    await element.decode();
    const canvas = document.createElement('canvas');
    canvas.width = element.naturalWidth;
    canvas.height = element.naturalHeight;
    const context = canvas.getContext('2d')!;
    context.drawImage(element, 0, 0);
    const rgba = [
      ...context.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1)
        .data,
    ];

    return { width: canvas.width, height: canvas.height, rgba };
  });
}
