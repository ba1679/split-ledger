import { test, expect } from '../fixtures.js';
import { ApiError } from '../../../src/api/index.js';
import { definitelyRejected } from '../../../src/features/expenses/save-outcome.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { readBrowserSplittingSnapshot, seedBrowserSplittingExpenses } from './fixture.js';
import { openConfirmedSettlementScreen } from './settlement-screen.js';
import {
  arrangeRejectedSimplificationSave,
  rejectedSimplificationSavePhrase,
  rejectedSimplificationSaveKey,
  simplificationSaveRejection,
  type RejectedSimplificationSave,
} from './rejected-simplification-save.js';

test('T141: injected contract rejection is definitive; server errors and transport loss remain unknown', () => {
  const { status, body } = simplificationSaveRejection;
  expect(status).toBe(400);
  expect(body.code).toBe('VALIDATION_ERROR');
  expect(definitelyRejected(new ApiError(status, body.code, body.message))).toBe(true);
  expect(definitelyRejected(new ApiError(500, 'INTERNAL_ERROR', 'unknown'))).toBe(false);
  expect(definitelyRejected(new TypeError('network response lost'))).toBe(false);
});

test('T141: isolated Given arms a pre-write rejection and leaves confirmed false revision and arrangements intact', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '車票', 幣別: 'JPY', 金額: '60', 付款人: 'Bob', 分攤者: 'Alice' },
    { 項目: '門票', 幣別: 'JPY', 金額: '60', 付款人: 'Carol', 分攤者: 'Bob' },
  ]);
  await openConfirmedSettlementScreen(page, world, false);
  await runIsolatedStep(
    {
      phrase: rejectedSimplificationSavePhrase,
      input: undefined,
      execute: (context) => arrangeRejectedSimplificationSave(page, context),
    },
    world,
  );
  const state = world.get<RejectedSimplificationSave>(rejectedSimplificationSaveKey);
  try {
    expect(state.requests).toEqual([]);
    // Direct transport probe belongs to the harness, not the Given's arrange operation.
    const result = await page.evaluate(
      async (path) => {
        const response = await fetch(path, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ simplifyDebts: true }),
        });

        return { status: response.status, body: await response.json() };
      },
      `/api/trips/${splittingTripId(world)}`,
    );
    expect(result).toEqual(simplificationSaveRejection);
    expect(state.requests).toHaveLength(1);
    expect(await readBrowserSplittingSnapshot(world)).toEqual(state.confirmed.snapshot);
  } finally {
    await state.restore();
  }
});
