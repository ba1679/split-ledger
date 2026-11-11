import { test, expect } from '../fixtures.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses, readBrowserSplittingSnapshot } from './fixture.js';
import {
  directSettlementScreenPhrase,
  openDirectSettlementScreen,
} from './direct-settlement-screen.js';
import {
  settlementScreenKey,
  settlementScreenWritesKey,
  type ConfirmedSettlementScreen,
} from './settlement-screen.js';

for (const initialMode of [false, true])
  test(`T139: isolated disabled screen Given from persisted mode ${initialMode}`, async ({
    page,
    world,
  }) => {
    await seedBrowserSplittingExpenses(page, world, [
      { 項目: '車票', 幣別: 'JPY', 金額: '60', 付款人: 'Bob', 分攤者: 'Alice' },
      { 項目: '門票', 幣別: 'JPY', 金額: '60', 付款人: 'Carol', 分攤者: 'Bob' },
    ]);
    if (initialMode) {
      const reply = await callApi(world, 'PATCH', `/api/trips/${splittingTripId(world)}`, {
        simplifyDebts: true,
      });
      expect(reply.status()).toBe(200);
    }
    const before = await readBrowserSplittingSnapshot(world);
    expect(before.settlement.simplifyDebts).toBe(initialMode);
    await runIsolatedStep(
      {
        phrase: directSettlementScreenPhrase,
        input: undefined,
        execute: (context) => openDirectSettlementScreen(page, context),
      },
      world,
    );
    const screen = world.get<ConfirmedSettlementScreen>(settlementScreenKey);
    expect(screen.snapshot.settlement.simplifyDebts).toBe(false);
    expect(screen.snapshot.settlement.accountingRevision).toBe(
      (BigInt(before.settlement.accountingRevision) + (initialMode ? 1n : 0n)).toString(),
    );
    expect(screen.snapshot.settlement.arrangements).toHaveLength(2);
    expect(screen.arrangementLinks).toHaveLength(2);
    expect(world.get(settlementScreenWritesKey)).toEqual([]);
    for (const key of [
      'members',
      'expenses',
      'shares',
      'repayments',
      'settlements',
      'adjustments',
    ] as const)
      expect(screen.snapshot.sources[key]).toEqual(before.sources[key]);
  });
