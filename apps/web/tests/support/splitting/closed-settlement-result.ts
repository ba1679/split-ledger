import { expect, type Page } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import {
  independentSplittingOracle,
  snapshotSplittingSources,
} from '../../../../api/tests/support/splitting/expense-fixture.js';
import { signedMajorAdjustment } from '../../../../api/tests/support/splitting/settlement-adjustments-result.js';
import { assertClosedSettlementProjection } from '../../../../api/tests/support/splitting/positive-settlement-closed-result.js';
import { assertSavedSettlement } from './lost-settlement-response.js';
import { readBrowserSplittingSnapshot } from './fixture.js';
import { settlementSaveKey, type BrowserSettlementSave } from './save-settlement.js';
import { settlementWritesKey } from './settlement-form.js';
import type { RepaymentBrowserWrite } from './repayment-draft.js';

export const closedSettlementPhrase =
  '{word} 的安排已關閉且保存實付 JPY {word} 與原應付 JPY {word}';

/** Independent display oracle: major-unit BigInt half-up, at most two decimal places. */
export function settlementSummaryAmount(amount: ExactAmount): string {
  const n = BigInt(amount.numerator);
  const d = BigInt(amount.denominator) * 10n ** BigInt(amount.minorUnit);
  expect(n).toBeGreaterThan(0n);
  expect(d).toBeGreaterThan(0n);
  const cents = (n * 200n + d) / (d * 2n);
  const fractional = (cents % 100n).toString().padStart(2, '0').replace(/0+$/, '');

  return `JPY ${cents / 100n}${fractional ? `.${fractional}` : ''}`;
}

export function assertNoRoundingPolicy(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    expect(key, 'No rounding strategy may be sent or stored').not.toMatch(
      /rounding|round_?policy|round_?mode/i,
    );
    assertNoRoundingPolicy(child);
  }
}

/** Read-only authority check reusable by the subsequent save-outcome sentences. */
export async function readClosedBrowserSettlement(world: LedgerWorld) {
  const saved = world.get<BrowserSettlementSave>(settlementSaveKey);
  const tripId = splittingTripId(world);
  const response = await callApi(
    world,
    'GET',
    `/api/trips/${tripId}/settlements/${saved.command.id}`,
  );
  expect(
    response.status(),
    'The original reserved settlement UUID must identify the saved record',
  ).toBe(200);
  const record = (await response.json()) as Record<string, unknown>;
  const after = await readBrowserSplittingSnapshot(world);
  assertSavedSettlement(saved.before, after, saved.command, record, tripId);
  assertClosedSettlementProjection(after.sources, saved.command, after.settlement);
  expect(world.get<RepaymentBrowserWrite[]>(settlementWritesKey)).toEqual([
    { method: 'POST', path: `/api/trips/${tripId}/settlements`, body: saved.command },
  ]);
  assertNoRoundingPolicy(saved.payload);
  assertNoRoundingPolicy(record);
  assertNoRoundingPolicy(after.sources);
  expect(await snapshotSplittingSources(world), 'Then must not change any source').toEqual(
    after.sources,
  );

  return { saved, record, after };
}

export async function assertBrowserSettlementClosed(
  page: Page,
  world: LedgerWorld,
  payer: string,
  paid: string,
  owed: string,
): Promise<void> {
  expect(payer).toBe('Amy');
  expect(paid).toMatch(/^[1-9]\d*$/);
  const expected = signedMajorAdjustment(owed);
  expect(BigInt(expected.numerator)).toBeGreaterThan(0n);
  const { saved, record } = await readClosedBrowserSettlement(world);
  expect(saved.command.debtorMemberId).toBe(splittingMemberId(world, payer));
  expect(saved.command.creditorMemberId).toBe(splittingMemberId(world, 'Alice'));
  expect(saved.command.currencyCode).toBe('JPY');
  expect(saved.command.paidAmount).toBe(paid);
  expect(independentSplittingOracle.equal(saved.command.expectedAmount, expected)).toBe(true);
  expect(independentSplittingOracle.equal(record.obligation as ExactAmount, expected)).toBe(true);
  // A transport loss may have left When temporarily uncertain. The application,
  // never this Then, must complete its original-ID reconciliation and show success.
  const summary = page
    .getByRole('status')
    .filter({ hasText: /結清成功|已結清|結清已儲存|結清已保存/ });
  await expect(summary).toHaveCount(1);
  await expect(summary).toBeVisible();
  const text = await summary.innerText();
  expect(text).toMatch(
    new RegExp(`應付[^\\n]*${settlementSummaryAmount(expected).replace('.', '\\.')}\\b(?![.\\d])`),
  );
  expect(text).toMatch(new RegExp(`實付[^\\n]*JPY ${paid}\\b(?![.\\d])`));
  expect(text).not.toMatch(/100\s*\/\s*3|33\.333|…|\.\.\.|取整方式/);
  await expect(page.getByRole('combobox', { name: /取整|四捨五入|向上|向下/ })).toHaveCount(0);
  await expect(page.getByRole('radiogroup', { name: /取整|四捨五入|向上|向下/ })).toHaveCount(0);
}
