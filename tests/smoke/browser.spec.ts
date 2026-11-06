import { expect, test } from '@playwright/test';

test('browser runtime', async ({ page }) => {
  await page.setContent('<h1>Toolchain ready</h1>');
  await expect(page.getByRole('heading')).toHaveText('Toolchain ready');
});
