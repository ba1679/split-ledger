import { Then, expect } from '../../../support/fixtures.js';
import type { ExpenseDeleteVerification } from '../../../support/expenses/delete-verification-fixture.js';
import { expenseStateAudit } from '../../../support/expenses/state-read-audit.js';
import { managementUI, waitForManagementReads } from '../../../support/trips/management-fixture.js';
import { managementSnapshot } from '../../../../../api/tests/support/trip-management/baseline.js';
import {
  ownerRead,
  assertOtherDataUnchanged,
} from '../../../../../api/tests/support/trip-management/preservation.js';
import { expectedCurrentState } from '../../../../../api/tests/support/trip-management/rejections.js';
import { assertMemberBalanceProjection } from '../../../../../api/tests/support/splitting/member-balances-result.js';

Then('支出刪除查證呈現 {string}', async ({ world }, result: string) => {
  const state = world.get<ExpenseDeleteVerification>('expense:deleteVerification');
  const act = world.get<{ readStart: number; state: unknown }>('expense:deleteVerificationAct');
  const expected =
    state.scenario === '一般可用且支出已刪'
      ? '原支出已刪'
      : state.scenario === '垃圾桶'
        ? '旅行在垃圾桶'
        : '旅行已永久刪除';
  expect(result).toBe(expected);
  const ui = managementUI(world),
    page = ui.page;
  if (result === '原支出已刪') {
    await expect(page.getByText(/支出已刪除|已刪除(?:這筆)?支出|晚餐已刪除/).first()).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/trips/${state.tripId}/?$`));
    await expect(page.getByText('晚餐', { exact: true })).toBeHidden();
  } else {
    await expect(
      page
        .getByRole('main')
        .getByText(
          result === '旅行在垃圾桶'
            ? /旅行[^。]*垃圾桶/
            : /旅行[^。]*(?:永久刪除|不存在|找不到)|整趟[^。]*(?:不存在|永久刪除)/,
        )
        .first(),
    ).toBeVisible();
    await expect(
      page.getByRole('status').filter({ hasText: /(?:支出|晚餐).*已刪除|刪除成功/ }),
    ).toBeHidden();
    await expect(page.getByRole('region', { name: '成員淨額', exact: true })).toBeHidden();
    await expect(page.locator('.saved-expense-sharing:visible')).toHaveCount(0);
    for (const button of await page
      .getByRole('button', { name: /^(儲存支出|確認刪除|刪除支出)$/ })
      .all())
      if (await button.isVisible()) await expect(button).toBeDisabled();
    if (result === '旅行在垃圾桶') {
      const next = page.getByRole('main').getByRole('link', { name: /垃圾桶|復原/ });
      await expect(next).toHaveAttribute('href', '/trips/trash');
      await next.click({ trial: true });
    }
  }
  await waitForManagementReads(ui);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  const statePath = `/api/trips/${state.tripId}/state`,
    expensePath = `/api/trips/${state.tripId}/expenses/${state.expenseId}`;
  const initial = state.reads
    .slice(0, act.readStart)
    .filter((read) => [statePath, expensePath].includes(read.path));
  expect(initial.length).toBeGreaterThan(0);
  expect(
    initial.every((read) => read.path === statePath && read.blocked),
    'Unavailable initial state must remain unknown without probing expense404',
  ).toBe(true);
  const probes = (await expenseStateAudit(page)).filter((event) => event.kind === 'expense-start');
  if (result === '原支出已刪') {
    expect(probes.length).toBeGreaterThan(0);
    for (const probe of probes)
      expect(probe).toMatchObject({
        tripId: state.tripId,
        expenseId: state.expenseId,
        state: 'active',
      });
  } else expect(probes).toEqual([]);
  for (const read of state.reads.slice(act.readStart)) expect(read.blocked).toBe(false);
  const authoritative = await ownerRead(world, statePath);
  expect(authoritative.status()).toBe(200);
  expect(await authoritative.json()).toEqual(expectedCurrentState(state.afterDelete!));
  if (result === '原支出已刪') {
    const missing = await ownerRead(world, expensePath);
    expect(missing.status()).toBe(404);
    const stable = (row: Record<string, unknown>) => {
      const { accounting_revision: _revision, updated_at: _updated, ...rest } = row;

      return rest;
    };
    expect(stable(state.afterDelete!.trips[0]!)).toEqual(stable(state.before.trips[0]!));
    const settlement = await ownerRead(world, `/api/trips/${state.tripId}/settlement`);
    expect(settlement.status()).toBe(200);
    assertMemberBalanceProjection(
      state.afterDelete!,
      await settlement.json(),
      [
        { 成員: 'Alice', 幣別: 'JPY', 淨額: '-2000' },
        { 成員: 'Amy', 幣別: 'JPY', 淨額: '1000' },
        { 成員: 'Bob', 幣別: 'JPY', 淨額: '1000' },
        { 成員: 'Alice', 幣別: 'TWD', 淨額: '300' },
        { 成員: 'Amy', 幣別: 'TWD', 淨額: '-300' },
      ],
      (name) => String(state.afterDelete!.members.find((row) => row.name === name)!.id),
    );
  } else if (result === '旅行在垃圾桶') {
    expect(state.afterDelete!.expenses).toEqual(state.before.expenses);
    expect(state.afterDelete!.shares).toEqual(state.before.shares);
  } else {
    expect(state.afterDelete!.trips).toEqual([]);
    expect(state.afterDelete!.expenses).toEqual([]);
    expect(state.transport.status).toBe(404);
  }
  expect(state.transport.errors.map(String)).toEqual([]);
  expect(state.transport.calls).toBe(1);
  expect(ui.writes.length).toBe(1);
  expect(await managementSnapshot(world)).toEqual(state.afterDelete);
  await assertOtherDataUnchanged(world);
});
