import { assertFailedJsonRead } from './failed-json-read.js';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { BackgroundRead } from './background-fixture.js';
import { assertBackgroundRetained } from './background-retained.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';

export async function assertBackgroundFailed(world: LedgerWorld): Promise<void> {
  const state = world.get<BackgroundRead>('loading:background'),
    ui = managementUI(world),
    page = ui.page;
  expect(state.result).toBe('明確失敗');
  expect(state.triggered).toBe(true);
  expect(state.requests.length).toBe(1);
  await assertFailedJsonRead(state.requests[0]!, state.exchanges[0]!.body);
  expect(state.released).toBe(true);
  expect(state.finished).toBe(1);
  await waitForManagementReads(ui);
  await assertBackgroundRetained(world);
  const region = page.getByRole('region', { name: '支出清單', exact: true });
  const error = region
    .getByRole('alert')
    .filter({ hasText: /尚未取得更新|無法更新|更新失敗|未能更新/ });
  await expect(error).toBeVisible();
  await expect(error).not.toContainText(
    /Failed to fetch|Load failed|fetch failed|SyntaxError|JSON|content.length|Unexpected token/i,
  );
  await expect(
    region.getByRole('button', { name: /^(重新更新清單|重新嘗試|重試)$/ }),
  ).toBeEnabled();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(
    region.getByRole('status').filter({ hasText: /更新成功|已取得最新|已更新/ }),
  ).toHaveCount(0);
  expect(state.errors.map(String)).toEqual([]);
}
