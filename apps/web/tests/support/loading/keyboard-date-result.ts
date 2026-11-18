import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import {
  ownerRead,
  assertOtherDataUnchanged,
} from '../../../../api/tests/support/trip-management/preservation.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';
import type { KeyboardDate } from './keyboard-date.js';
import { omitFields } from './operation-business-result.js';
import { assertSpinnerOnly } from './spinner-result.js';

export async function assertKeyboardDateResult(world: LedgerWorld, result: string): Promise<void> {
  const state = world.get<KeyboardDate>('loading:keyboardDate'),
    { wait } = state,
    ui = managementUI(world),
    page = ui.page;
  expect(result).toBe(state.result);
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
    true,
  );
  expect(ui.writes.length).toBe(1);
  expect(wait.exchanges.length).toBe(1);
  expect(wait.errors.map(String)).toEqual([]);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.getAnimations().filter((animation) => animation.playState === 'running').length,
      ),
    )
    .toBe(0);
  if (result === '延遲') {
    expect(wait.released).toBe(false);
    expect(wait.finished).toBe(0);
    await expect(wait.control).toBeFocused();
    await expect(wait.control).toHaveAccessibleName(state.originalName);
    await expect(wait.control).toHaveAttribute('aria-busy', 'true');
    await assertSpinnerOnly(wait.control.getByRole('status'), /\S/);
    await expect(page.getByRole('textbox', { name: '開始日', exact: true })).toHaveValue(
      '2027/03/09',
    );
    await expect(page.getByRole('textbox', { name: '結束日', exact: true })).toHaveValue(
      '2027/03/16',
    );
    await expect(
      page.getByRole('status').filter({ hasText: /儲存成功|日期已更新|已儲存日期/ }),
    ).toHaveCount(0);
  } else {
    expect(result).toBe('成功');
    expect(wait.released).toBe(true);
    await expect.poll(() => wait.finished).toBe(1);
    await waitForManagementReads(ui);
    const notice = page
      .getByRole('status')
      .filter({ hasText: /日期已更新|已儲存日期|儲存成功|保存成功/ });
    await expect(notice).toBeVisible();
    await expect
      .poll(() => notice.ariaSnapshot())
      .toMatch(/status:.*(?:日期已更新|已儲存日期|儲存成功|保存成功)/);
    await expect
      .poll(
        () =>
          state.announcements.filter((text) => /日期已更新|已儲存日期|儲存成功|保存成功/.test(text))
            .length,
      )
      .toBe(1);
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    if (await wait.control.isVisible()) await expect(wait.control).toBeFocused();
    else await expect(state.trigger).toBeFocused();
    const response = await ownerRead(world, wait.path);
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ id: wait.tripId, ...state.target });
    const dates = page
      .getByRole('region', { name: '旅行資料', exact: true })
      .locator('p')
      .filter({ has: state.trigger });
    await expect(dates).toContainText(/03[/.月-]0?9|3月9日/);
    await expect(dates).toContainText(/03[/.月-]16|3月16日/);
    await expect(state.trigger).toHaveAccessibleName('旅行日期');
  }
  for (const text of new Set(
    state.announcements.filter((text) => /日期|儲存|保存|成功/.test(text)),
  ))
    expect(
      state.announcements.filter((value) => value === text).length,
      'No repeated identical live announcement',
    ).toBe(1);
  const after = await managementSnapshot(world);
  expect(after).toEqual(wait.after);
  for (const key of Object.keys(wait.before) as (keyof typeof wait.before)[])
    if (key !== 'trips') expect(after[key]).toEqual(wait.before[key]);
  expect(omitFields(after.trips[0]!, ['start_date', 'end_date', 'updated_at'])).toEqual(
    omitFields(wait.before.trips[0]!, ['start_date', 'end_date', 'updated_at']),
  );
  const dates = await world.db.query(
    'SELECT start_date::text,end_date::text FROM trips WHERE id=$1',
    [wait.tripId],
  );
  expect(dates.rows).toEqual([
    { start_date: state.target.startDate, end_date: state.target.endDate },
  ]);
  expect(new URL(page.url()).pathname).toBe(`/trips/${wait.tripId}`);
  await assertOtherDataUnchanged(world);
}
