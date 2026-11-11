import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import {
  directExpenseArrangements,
  assertExactArrangementSet,
} from './expense-arrangements-result.js';
import { snapshotExactBalances } from './simplification-mode-fixture.js';
import {
  assertSimplificationCountProjection,
  type CountSettlementView,
} from './simplification-count-result.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import type { SourceSnapshot } from './types.js';

export const simplificationExplanationPhrase = '結算說明以三句內描述付款對象與筆數變化';
type ExplainedView = CountSettlementView & { explanation: string };

/** Check meaning independently of one exact template or punctuation spelling. */
export function assertChangedExplanationText(text: string): void {
  expect(typeof text).toBe('string');
  expect(text.trim().length).toBeGreaterThan(0);
  expect(text).toMatch(/[\u3400-\u9fff]/);
  expect(
    text.split(/[。！？!?]+/u).filter((sentence) => sentence.trim()).length,
  ).toBeLessThanOrEqual(3);
  expect(text).not.toMatch(/改道|精確|公平/);
  const clauses = text.split(/[。！？!?；;，,\n]/u);
  expect(
    clauses.some((clause) =>
      /Alice\s*(?:現在|改為|改成|改|可|直接|只需|需|將|\s)*(?:付款給|付款(?:給|向)?|支付給|支付|付給|付|轉帳給|轉給|→|->)\s*(?:JPY\s*60\s*)?Carol/.test(
        clause,
      ),
    ),
    'Explanation must describe Alice paying Carol, not merely list their names',
  ).toBe(true);
  expect(text, 'Explanation must state the actual reduction from two payments to one').toMatch(
    /(?:兩|二|2)\s*筆[^。！？!?]{0,24}(?:變|減|改|合|整)[^。！？!?]{0,12}(?:一|1)\s*筆/,
  );
  const unchanged = /不變|未變|不受影響|不會改變|沒有改變|維持|保持|保留/;
  expect(
    clauses.some(
      (clause) =>
        /(?:各人|每人|成員|大家)/.test(clause) &&
        /(?:應收.*應付|應付.*應收|淨額)/.test(clause) &&
        unchanged.test(clause),
    ),
    'Explanation must preserve each member’s receivable/payable total',
  ).toBe(true);
  expect(
    clauses.some(
      (clause) => /(?:原始|原有|原本).*(?:紀錄|記錄|帳目)/.test(clause) && unchanged.test(clause),
    ),
    'Explanation must preserve original records',
  ).toBe(true);
}

export function assertChangedExplanationProjection(
  snapshot: SourceSnapshot,
  view: ExplainedView,
  ids: { alice: string; bob: string; carol: string },
): void {
  assertSimplificationCountProjection(snapshot, view);
  expect(view.simplifyDebts).toBe(true);
  const amount = { numerator: '60', denominator: '1', minorUnit: 0 };
  assertExactArrangementSet(directExpenseArrangements(snapshot), [
    { debtorMemberId: ids.alice, creditorMemberId: ids.bob, currencyCode: 'JPY', amount },
    { debtorMemberId: ids.bob, creditorMemberId: ids.carol, currencyCode: 'JPY', amount },
  ]);
  assertExactArrangementSet(view.arrangements, [
    { debtorMemberId: ids.alice, creditorMemberId: ids.carol, currencyCode: 'JPY', amount },
  ]);
  expect(view.directArrangementCount).toBe(2);
  expect(view.suggestedArrangementCount).toBe(1);
  assertChangedExplanationText(view.explanation);
}

export async function assertSimplificationExplanation(world: LedgerWorld): Promise<void> {
  expect(world.response?.status(), 'The mode change must succeed').toBe(200);
  const before = world.get<SourceSnapshot>('splitting:before');
  const snapshot = await snapshotSplittingSources(world);
  for (const key of [
    'members',
    'expenses',
    'shares',
    'repayments',
    'settlements',
    'adjustments',
  ] as const)
    expect(snapshot[key], 'Mode changes must preserve original records').toEqual(before[key]);
  expect(snapshotExactBalances(snapshot)).toEqual(snapshotExactBalances(before));
  const response = await callApi(world, 'GET', `/api/trips/${splittingTripId(world)}/settlement`);
  expect(response.status(), 'Product must expose the settlement explanation').toBe(200);
  assertChangedExplanationProjection(snapshot, (await response.json()) as ExplainedView, {
    alice: splittingMemberId(world, 'Alice'),
    bob: splittingMemberId(world, 'Bob'),
    carol: splittingMemberId(world, 'Carol'),
  });
  expect(await snapshotSplittingSources(world), 'Then must only read facts').toEqual(snapshot);
}
