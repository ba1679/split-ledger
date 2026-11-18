import { Then, expect } from '../../../support/fixtures.js';
import type { BackgroundRead } from '../../../support/loading/background-fixture.js';
import { assertBackgroundRetained } from '../../../support/loading/background-retained.js';
import { assertSpinnerOnly } from '../../../support/loading/spinner-result.js';
import { connectedQueryExchanges } from '../../../support/loading/query-attempts.js';

Then('更新僅顯示局部等待而保留全部已載入資料', async ({ page, world }) => {
  const state = world.get<BackgroundRead>('loading:background');
  expect(state.result).toBe('延遲');
  expect(state.triggered).toBe(true);
  expect(state.requests.length).toBe(1);
  expect(state.requests[0]!.failure()).toBeNull();
  expect(connectedQueryExchanges(state.exchanges).length).toBe(1);
  expect(state.finished).toBe(0);
  expect(state.released).toBe(false);
  await assertBackgroundRetained(world);
  const region = page.getByRole('region', { name: '支出清單', exact: true });
  await expect(region).toBeVisible();
  await assertSpinnerOnly(
    region.getByRole('status', { name: /更新.*支出|支出.*更新|背景更新/ }),
    /更新.*支出|支出.*更新|背景更新/,
  );
  const allBusy = await page.locator('[aria-busy="true"]').count();
  const insideBusy =
    (await region.locator('[aria-busy="true"]').count()) +
    ((await region.getAttribute('aria-busy')) === 'true' ? 1 : 0);
  expect(allBusy).toBeGreaterThan(0);
  expect(allBusy).toBe(insideBusy);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(region.getByRole('alert')).toHaveCount(0);
  await expect(
    page.getByRole('status').filter({ hasText: /更新成功|已取得最新|已更新/ }),
  ).toHaveCount(0);
  expect(state.errors.map(String)).toEqual([]);
});
