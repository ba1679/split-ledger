import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import {
  assertExactArrangementSet,
  type ExpenseArrangementRow,
} from './expense-arrangements-result.js';
import {
  assertSimplificationCountProjection,
  type CountSettlementView,
} from './simplification-count-result.js';
import type { AccessArrangement } from './access-fixture.js';
import type { SourceSnapshot } from './types.js';

export const settlementArrangementsPhrase = '結算付款安排如下：';

export function settlementTableAmount(text: string): ExactAmount {
  expect(text, 'Table amounts must be positive major-unit rational numbers').toMatch(
    /^\d+(?:\/\d+|\.\d+)?$/,
  );
  const [numerator, denominator] = text.includes('/')
    ? text.split('/')
    : [text.replace('.', ''), (10n ** BigInt(text.split('.')[1]?.length ?? 0)).toString()];
  expect(BigInt(numerator!) > 0n && BigInt(denominator!) > 0n).toBe(true);

  return { numerator: numerator!, denominator: denominator!, minorUnit: 0 };
}

/** Check the complete table, source-only mode oracle, and opaque current-version keys. */
export function assertSettlementArrangementProjection(
  snapshot: SourceSnapshot,
  view: CountSettlementView,
  expected: readonly Omit<AccessArrangement, 'key'>[],
): void {
  expect(expected.length).toBeGreaterThan(0);
  assertSimplificationCountProjection(snapshot, view);
  assertExactArrangementSet(view.arrangements, expected);
  const memberIds = snapshot.members.map((row) => row.id);
  const keys = view.arrangements.map((row) => row.key);
  const order = view.arrangements.map((row) =>
    [row.currencyCode, row.debtorMemberId, row.creditorMemberId].join('\u0000'),
  );
  expect(order, 'Arrangements must use stable currency/debtor/creditor ID ordering').toEqual(
    [...order].sort(),
  );
  expect(new Set(keys).size, 'Each current arrangement must have a distinct opaque key').toBe(
    keys.length,
  );
  for (const row of view.arrangements) {
    expect(row.key).toEqual(expect.any(String));
    expect(
      row.key.trim().length,
      'The settlement command requires a nonempty arrangement key',
    ).toBeGreaterThan(0);
    expect(memberIds).toContain(row.debtorMemberId);
    expect(memberIds).toContain(row.creditorMemberId);
    expect(row.debtorMemberId).not.toBe(row.creditorMemberId);
  }
}

export async function assertSettlementArrangements(
  world: LedgerWorld,
  rows: readonly ExpenseArrangementRow[],
): Promise<void> {
  expect(
    world.response,
    'A settlement read or mode PATCH must precede this assertion',
  ).toBeDefined();
  expect(world.response!.status()).toBe(200);
  const expected = rows.map((row) => {
    expect(Object.keys(row).sort()).toEqual(['付款人', '收款人', '幣別', '金額'].sort());
    expect(row.幣別).toMatch(/^[A-Z]{3}$/);

    return {
      debtorMemberId: splittingMemberId(world, row.付款人),
      creditorMemberId: splittingMemberId(world, row.收款人),
      currencyCode: row.幣別,
      amount: settlementTableAmount(row.金額),
    };
  });
  const before = await snapshotSplittingSources(world);
  const read = async () => {
    const response = await callApi(world, 'GET', `/api/trips/${splittingTripId(world)}/settlement`);
    expect(response.status(), 'Product must expose the current settlement arrangements').toBe(200);
    const view = (await response.json()) as CountSettlementView;
    assertSettlementArrangementProjection(before, view, expected);

    return view;
  };
  const first = await read();
  const actReply = world.state.get('splitting:settlementView') as CountSettlementView | undefined;
  if (actReply)
    expect(
      first,
      'The original read must retain its current mode, revision, keys and ordering',
    ).toEqual(actReply);
  expect(
    await read(),
    'Same sources must reproduce arrangement ordering, exact amounts and keys',
  ).toEqual(first);
  expect(
    await snapshotSplittingSources(world),
    'Read-only Then must preserve every source and revision',
  ).toEqual(before);
}
