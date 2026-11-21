import { expect } from '@playwright/test';
import { test } from '../fixtures.js';
import { arrangeAnalysisRows } from './arrange.js';
import { openConfirmedBrowserAnalysis, openBrowserCategoryInfo } from './page.js';
import { controlNextAnalysis } from './response.js';
import { refocusBrowserAnalysis } from './states.js';
import { setAnalysisLifecycle } from '../../../../api/tests/support/category-analysis/access.js';

for (const viewport of ['desktop', 'mobile'] as const) {
  test.describe(`analysis lifecycle cancellation ${viewport}`, () => {
    test.use({ analysisViewport: viewport });
    test('remote trash cancels held analysis read and removes visible accounting', async ({
      page,
      world,
      analysisViewport,
    }) => {
      await arrangeAnalysisRows(
        page,
        world,
        [
          {
            項目: '餐點',
            分類: '餐飲',
            幣別: 'TWD',
            金額: '200',
            付款人: 'Alice',
            分攤者: 'Alice、Amy',
          },
        ],
        analysisViewport,
      );
      await openConfirmedBrowserAnalysis(page, world);
      await openBrowserCategoryInfo(page, world, '個人', '餐飲');
      const held = controlNextAnalysis(world, '延遲成功');
      let cancelled = 0;
      page.on('requestfailed', (request) => {
        if (new URL(request.url()).pathname === held.path) cancelled++;
      });
      await refocusBrowserAnalysis(page);
      await expect.poll(() => held.arrived).toBe(true);
      expect(held.finished).toBe(false);
      expect(cancelled).toBe(0);
      await setAnalysisLifecycle(world, '垃圾桶');
      await refocusBrowserAnalysis(page);
      await expect(
        page.getByRole('heading', { name: '旅行已在垃圾桶', exact: true }),
      ).toBeVisible();
      await expect(
        page.locator(
          '.analysis-total,.analysis-details,.recharts-sector,[role="dialog"][aria-label="分類資訊"]',
        ),
      ).toHaveCount(0);
      await expect
        .poll(() => cancelled, {
          message: 'Unavailable trip must abort its in-flight analysis read',
        })
        .toBe(1);

      held.release();
      await expect.poll(() => held.finished).toBe(true);
      const { callApi } = await import('../../../../api/tests/support/seed.js');
      const { analysisContext } =
        await import('../../../../api/tests/support/category-analysis/fixture.js');
      const { randomUUID } = await import('node:crypto');
      const tripId = analysisContext(world).tripId;
      const revision = (
        await world.db.query('SELECT lifecycle_revision FROM trips WHERE id=$1', [tripId])
      ).rows[0].lifecycle_revision;
      const restored = await callApi(
        world,
        'POST',
        `/api/trips/${tripId}/restore`,
        { operationId: randomUUID(), expectedLifecycleRevision: String(revision) },
        'Alice',
      );
      expect(restored.status(), await restored.text()).toBe(200);
      const freshRead = page.waitForResponse(
        (response) => new URL(response.url()).pathname === held.path && response.status() === 200,
      );
      await refocusBrowserAnalysis(page);
      const fresh = await freshRead;
      const { checkBrowserAnalysisSource } = await import('./page.js');
      const { analysisSnapshot } =
        await import('../../../../api/tests/support/category-analysis/fixture.js');
      checkBrowserAnalysisSource(world, await fresh.json(), await analysisSnapshot(world));
      await expect(page.getByLabel('個人總額', { exact: true })).toHaveText('100');
      await expect(page.getByRole('dialog', { name: '分類資訊', exact: true })).toHaveCount(0);
    });
  });
}
