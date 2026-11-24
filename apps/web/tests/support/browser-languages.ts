import type { BrowserContext } from '@playwright/test';

export async function setBrowserLanguages(
  context: BrowserContext,
  languages: readonly string[],
  primaryLanguage: string | undefined = languages[0],
): Promise<void> {
  await context.addInitScript(
    ({ languages, primaryLanguage }) => {
      Object.defineProperties(window.navigator, {
        language: { configurable: true, get: () => primaryLanguage },
        languages: { configurable: true, get: () => languages },
      });
    },
    { languages, primaryLanguage },
  );
}
