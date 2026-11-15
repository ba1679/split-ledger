import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Observe and cancel the intercepted chooser without assigning an empty FileList.
 * Like Puppeteer's FileChooser.cancel, emit cancel on its actual input element.
 * This is a controlled DOM cancel, not a claim of native OS picker coverage.
 * https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer-core/src/common/FileChooser.ts
 */
export async function cancelFileChooser(page: Page, trigger: Locator) {
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), trigger.click()]);
  const result = await chooser.element().evaluate((element) => {
    if (!(element instanceof HTMLInputElement) || element.type !== 'file')
      throw new Error('Chooser must belong to the actual file input');
    const before = [...(element.files ?? [])];
    const events: string[] = [];
    const observe = (event: Event) => {
      events.push(event.type);
    };
    for (const name of ['cancel', 'input', 'change']) element.addEventListener(name, observe);
    try {
      element.dispatchEvent(new Event('cancel', { bubbles: true }));
      const after = [...(element.files ?? [])];
      const metadata = (file: File) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      });

      return {
        events,
        before: before.map(metadata),
        after: after.map(metadata),
        sameReferences:
          before.length === after.length && before.every((file, index) => file === after[index]),
      };
    } finally {
      for (const name of ['cancel', 'input', 'change']) element.removeEventListener(name, observe);
    }
  });

  expect(result.events).toEqual(['cancel']);
  expect(result.sameReferences).toBe(true);
  expect(result.after).toEqual(result.before);

  return result;
}
