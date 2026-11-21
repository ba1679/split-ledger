import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { setAnalysisLifecycle } from '../../../../api/tests/support/category-analysis/access.js';
import { analysisContext } from '../../../../api/tests/support/category-analysis/fixture.js';

export async function setBrowserAnalysisLifecycle(page: Page, world: LedgerWorld, state: string) {
  await setAnalysisLifecycle(world, state);
  if (state === '已復原' && new URL(page.url()).pathname.endsWith('/analysis')) {
    await page.getByRole('link', { name: /返回.*帳本|旅行帳本/ }).click();
    await expect(page).toHaveURL(new RegExp(`/trips/${analysisContext(world).tripId}$`));
  }
}
