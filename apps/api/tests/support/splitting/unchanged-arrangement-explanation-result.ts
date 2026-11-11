import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import { snapshotExactBalances } from './simplification-mode-fixture.js';
import { assertExactArrangementSet } from './expense-arrangements-result.js';
import {
  assertSimplificationCountProjection,
  type CountSettlementView,
} from './simplification-count-result.js';
import type { SourceSnapshot } from './types.js';

export const unchangedArrangementExplanationPhrase = '結算說明指出付款安排無需調整';

/** Accept equivalent Chinese wording, while requiring the actual unchanged single payment. */
export function assertUnchangedArrangementProjection(
  snapshot: SourceSnapshot,
  view: CountSettlementView & { explanation: string },
  amyId: string,
  aliceId: string,
): void {
  expect(typeof view.explanation).toBe('string');
  const explanation = view.explanation.trim();
  expect(explanation.length).toBeGreaterThan(0);
  expect(
    explanation.split(/[。！？!?]+/u).filter((sentence) => sentence.trim()).length,
  ).toBeLessThanOrEqual(3);
  expect(explanation, 'Explain that the existing payment arrangement needs no change').toMatch(
    /(?:付款|安排)[\s\S]*(?:(?:無需|無須|不需(?:要)?|不用|不必)[\s\S]{0,12}(?:調整|更動|變更|改變)|(?:維持|保留)[\s\S]{0,12}(?:即可|不變))/u,
  );
  expect(explanation).not.toMatch(
    /改道|精確|公平|(?:已|成功)(?:減少|省下)|無需(?:再)?付款|不用(?:再)?付款/u,
  );
  assertSimplificationCountProjection(snapshot, view);
  expect(view.simplifyDebts).toBe(true);
  expect(view.directArrangementCount).toBe(1);
  expect(view.suggestedArrangementCount).toBe(1);
  assertExactArrangementSet(view.arrangements, [
    {
      debtorMemberId: amyId,
      creditorMemberId: aliceId,
      currencyCode: 'JPY',
      amount: { numerator: '500', denominator: '1', minorUnit: 0 },
    },
  ]);
}

export async function assertUnchangedArrangementExplanation(world: LedgerWorld): Promise<void> {
  expect(world.response, 'The simplification PATCH must precede this assertion').toBeDefined();
  expect(world.response!.status()).toBe(200);
  const before = world.get<SourceSnapshot>('splitting:before');
  const current = await snapshotSplittingSources(world);
  for (const key of [
    'members',
    'expenses',
    'shares',
    'repayments',
    'settlements',
    'adjustments',
  ] as const)
    expect(current[key], 'Changing suggestions must preserve every source row').toEqual(
      before[key],
    );
  expect(
    snapshotExactBalances(current),
    'Changing suggestions must preserve all exact nets',
  ).toEqual(snapshotExactBalances(before));
  const read = async () => {
    const response = await callApi(world, 'GET', `/api/trips/${splittingTripId(world)}/settlement`);
    expect(response.status()).toBe(200);
    const view = (await response.json()) as CountSettlementView & { explanation: string };
    assertUnchangedArrangementProjection(
      current,
      view,
      splittingMemberId(world, 'Amy'),
      splittingMemberId(world, 'Alice'),
    );

    return view;
  };
  const first = await read();
  expect(
    await read(),
    'Repeated reads must preserve the explanation and current arrangement',
  ).toEqual(first);
  expect(await snapshotSplittingSources(world), 'Then must remain read-only').toEqual(current);
}
