import { expect, type Locator } from '@playwright/test';

/** Check rendered graphics and rendered text separately from accessible naming. */
export async function assertSpinnerOnly(spinner: Locator, name: RegExp): Promise<void> {
  await expect(spinner).toBeVisible();
  await expect(spinner).toHaveAccessibleName(name);
  const visual = await spinner.evaluate((element) => {
    const visibleText: string[] = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim()) continue;
      let hidden = false;
      for (
        let parent = node.parentElement;
        parent && element.contains(parent);
        parent = parent.parentElement
      ) {
        const style = getComputedStyle(parent);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.opacity === '0' ||
          style.clipPath === 'inset(50%)' ||
          /^rect\(0px[, ]+0px[, ]+0px[, ]+0px\)$/.test(style.clip)
        )
          hidden = true;
      }
      const range = document.createRange();
      range.selectNode(node);
      if (!hidden && [...range.getClientRects()].some((box) => box.width > 1 && box.height > 1))
        visibleText.push(node.textContent.trim());
    }
    const graphic = [element, ...element.querySelectorAll('*')].some((node) => {
      const box = node.getBoundingClientRect(),
        style = getComputedStyle(node);

      return (
        box.width >= 8 &&
        box.height >= 8 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        (node instanceof SVGElement ||
          [
            style.borderTopWidth,
            style.borderRightWidth,
            style.borderBottomWidth,
            style.borderLeftWidth,
          ].some((width) => parseFloat(width) > 0))
      );
    });

    return { visibleText, graphic };
  });
  expect(visual.visibleText, 'Busy feedback must have no visible loading text').toEqual([]);
  expect(visual.graphic, 'A graphical spinner must exist').toBe(true);
  await expect(spinner.locator('button,a,input,select,textarea,[tabindex="0"]')).toHaveCount(0);
  expect(await spinner.getAttribute('tabindex')).not.toBe('0');
}
