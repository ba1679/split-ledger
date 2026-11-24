import { callApi } from '../../../../api/tests/support/seed.js';
import {
  directExpenseArrangements,
  assertExactArrangementSet,
} from '../../../../api/tests/support/splitting/expense-arrangements-result.js';
import { snapshotSplittingSources } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import {
  assertSimplificationCountProjection,
  type CountSettlementView,
} from '../../../../api/tests/support/splitting/simplification-count-result.js';
import type { SettlementViewWithExplanationDetails } from '../../../src/features/settlement/types.js';
import { Given, Then, expect } from '../../support/fixtures.js';
import { setBrowserLanguages } from '../../support/browser-languages.js';
import {
  readBrowserSplittingSnapshot,
  seedBrowserSplittingExpenses,
  type BrowserSplittingSnapshot,
} from '../../support/splitting/fixture.js';

type Result = '未開啟簡化' | '開啟後安排相同' | '開啟後安排改變';
const stateKey = '008:english-explanation';
const expectedKind = {
  未開啟簡化: 'direct',
  開啟後安排相同: 'unchanged',
  開啟後安排改變: 'changed',
} as const;

interface ExplanationState {
  result: Result;
  snapshot: BrowserSplittingSnapshot;
  extended: ExplanationProjection;
}

type ExplanationProjection = SettlementViewWithExplanationDetails & CountSettlementView;

Given('英文旅行的付款模式及安排屬於 {string}', async ({ page, world }, result: Result) => {
  expect(Object.hasOwn(expectedKind, result)).toBe(true);
  await setBrowserLanguages(page.context(), ['en']);
  const rows =
    result === '開啟後安排相同'
      ? [{ 項目: 'Lunch', 幣別: 'JPY', 金額: '500', 付款人: 'Alice', 分攤者: 'Amy' }]
      : [
          { 項目: 'Train tickets', 幣別: 'JPY', 金額: '60', 付款人: 'Bob', 分攤者: 'Alice' },
          { 項目: 'Museum tickets', 幣別: 'JPY', 金額: '60', 付款人: 'Carol', 分攤者: 'Bob' },
        ];
  await seedBrowserSplittingExpenses(page, world, rows);
  if (result !== '未開啟簡化') {
    const reply = await callApi(world, 'PATCH', `/api/trips/${splittingTripId(world)}`, {
      simplifyDebts: true,
    });
    expect(reply.status()).toBe(200);
  }
  const snapshot = await readBrowserSplittingSnapshot(world);
  const response = await callApi(
    world,
    'GET',
    `/api/trips/${splittingTripId(world)}/settlement?include=explanationDetails`,
  );
  expect(response.status()).toBe(200);
  const extended = (await response.json()) as ExplanationProjection;
  expect(extended.explanationDetails.kind).toBe(expectedKind[result]);
  expect(Object.keys(extended.explanationDetails).sort()).toEqual(['directArrangements', 'kind']);
  assertSimplificationCountProjection(snapshot.sources, extended);
  assertExactArrangementSet(
    extended.explanationDetails.directArrangements,
    directExpenseArrangements(snapshot.sources),
  );
  expect(extended.explanationDetails.directArrangements).toHaveLength(
    extended.directArrangementCount,
  );
  expect(await snapshotSplittingSources(world)).toEqual(snapshot.sources);
  world.set(stateKey, { result, snapshot, extended } satisfies ExplanationState);
  world.set('splitting:expectedSettlementLanguage', 'en');
});

Then('英文結算說明符合 {string} 且來源帳務不變', async ({ page, world }, result: Result) => {
  const state = world.get<ExplanationState>(stateKey);
  expect(result).toBe(state.result);
  const uiUrl = new URL(world.get<string>('splitting:browserUISettlementURL'));
  expect(uiUrl.searchParams.get('include')).toBe('explanationDetails');
  const uiView = world.get<ExplanationProjection>('splitting:browserUISettlementView');
  expect(uiView).toEqual(state.extended);
  expect(uiView.accountingRevision).toBe(state.snapshot.settlement.accountingRevision);

  const explanation = page.locator('.simplification-panel > p').first();
  await expect(explanation).toBeVisible();
  const text = (await explanation.innerText()).trim();
  expect(text).toMatch(/[A-Za-z]{2,}/u);
  expect(text).not.toMatch(/\p{Script=Han}/u);
  expect(text).not.toBe(state.extended.explanation);
  expect((text.match(/[.!?]/gu) ?? []).length).toBeLessThanOrEqual(3);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('switch')).toHaveAttribute('aria-label', /^[A-Za-z]/u);
  await expect(page.getByRole('heading', { name: 'Settle up', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Payments made', exact: true })).toBeVisible();

  if (result === '未開啟簡化') {
    expect(text).toContain('Original payment setup applies (2 payments).');
    expect(state.extended.directArrangementCount).toBe(2);
    expect(state.extended.suggestedArrangementCount).toBe(2);
  } else if (result === '開啟後安排相同') {
    expect(text).toMatch(/(?:no\s+(?:change|adjustment)|already|unchanged)/iu);
    expect(state.extended.directArrangementCount).toBe(1);
    expect(state.extended.suggestedArrangementCount).toBe(1);
  } else {
    expect(state.extended.directArrangementCount).toBe(2);
    expect(state.extended.suggestedArrangementCount).toBe(1);
    for (const relationship of [
      /Alice[^.!?]{0,120}Bob/u,
      /Bob[^.!?]{0,120}Carol/u,
      /Alice[^.!?]{0,120}Carol/u,
    ])
      expect(text).toMatch(relationship);
    expect(text).toMatch(/\b(?:2|two)\b/iu);
    expect(text).toMatch(/\b(?:1|one)\b/iu);
  }
  expect(await readBrowserSplittingSnapshot(world)).toEqual(state.snapshot);
});
