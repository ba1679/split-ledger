import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { arrangeInitialRead, awaitInitialReadHeld, type InitialRead } from './initial-read.js';
import { assertInitialFailed } from './initial-failed.js';
import { initialContentRegion } from './initial-skeleton.js';
import { queryAttempts } from './query-attempts.js';
import { managementUI } from '../trips/management-fixture.js';

export async function arrangeInitialRecovery(page: Page, world: LedgerWorld): Promise<void> {
  await arrangeInitialRead(page, world, '旅行清單', '一般旅行', '明確失敗');
  const state = world.get<InitialRead>('loading:initial'),
    ui = managementUI(world);
  await page.goto(state.route, { waitUntil: 'domcontentloaded' });
  await awaitInitialReadHeld(world);
  state.release();
  await assertInitialFailed(world);
  const attempts = queryAttempts(ui, state.query).length;
  // A released initial-read fault no longer matches later native responses.
  state.result = '成功';
  expect(await page.evaluate(() => navigator.onLine)).toBe(true);
  await expect(
    initialContentRegion(page, state).getByRole('button', {
      name: /^(重新嘗試|重試|重新取得旅行清單)$/,
    }),
  ).toBeEnabled();
  expect(queryAttempts(ui, state.query).length).toBe(attempts);
  expect(ui.writes.length).toBe(0);
  world.set('loading:initialRecovery', { attemptsBeforeRetry: attempts });
}
