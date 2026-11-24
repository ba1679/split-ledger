import { Given, Then, When, expect } from '../../support/fixtures.js';
import { callApi, seedIdentity } from '../../support/seed.js';
import type { AccessArrangement } from '../../support/splitting/access-fixture.js';
import {
  assertExactArrangementSet,
  directExpenseArrangements,
  type ExpenseArrangementRow,
} from '../../support/splitting/expense-arrangements-result.js';
import {
  independentSplittingOracle,
  seedSplittingExpenses,
  snapshotSplittingSources,
} from '../../support/splitting/expense-fixture.js';
import { splittingMemberId, splittingTripId } from '../../support/splitting/members-fixture.js';
import { readTripSettlement } from '../../support/splitting/read-settlement-command.js';
import {
  assertNoSplittingErrorDisclosure,
  captureSplittingRejectionBaseline,
} from '../../support/splitting/rejection.js';
import type { DeterministicSettlementView } from '../../support/splitting/reproducible-settlement-result.js';
import { settlementTableAmount } from '../../support/splitting/settlement-arrangements-result.js';
import {
  assertSimplificationCountProjection,
  independentNetCandidate,
} from '../../support/splitting/simplification-count-result.js';
import { assertChangedExplanationProjection } from '../../support/splitting/simplification-explanation-result.js';
import type { SourceSnapshot } from '../../support/splitting/types.js';
import type { LedgerWorld } from '../../support/world.js';

const exampleExpenses = [
  { 項目: '結算驗收車票', 幣別: 'JPY', 金額: '60', 付款人: 'Bob', 分攤者: 'Alice' },
];

type QueryActor = '甲' | '乙' | null;

const errorStatus = { UNAUTHENTICATED: 401, NOT_FOUND: 404, TRIP_TRASHED: 409 } as const;
const originalFields = [
  'accountingRevision',
  'simplifyDebts',
  'balances',
  'arrangements',
  'explanation',
  'directArrangementCount',
  'suggestedArrangementCount',
];
type ExplanationKind = 'direct' | 'unchanged' | 'changed';
type DirectArrangement = Omit<AccessArrangement, 'key'>;
interface ExplanationView extends DeterministicSettlementView {
  explanationDetails: { kind: ExplanationKind; directArrangements: DirectArrangement[] };
}

function assertOriginalExplanation(view: DeterministicSettlementView): void {
  expect(view.explanation.match(/[^。！？]+[。！？]/gu)?.length).toBeLessThanOrEqual(3);
  expect(view.explanation).toMatch(
    new RegExp(`(?:共|改為) ${view.suggestedArrangementCount} 筆付款`, 'u'),
  );
  expect(view.explanation).toContain('每位成員的應收應付淨額保持不變。');
  expect(view.explanation).toContain('原始支出與還款紀錄保持不變。');
}

async function assertExplanationProjection(world: LedgerWorld): Promise<ExplanationView> {
  const view = world.get<ExplanationView>('splitting:settlementView');
  const source = world.get<SourceSnapshot>('splitting:before');
  expect(Object.keys(view).sort()).toEqual([...originalFields, 'explanationDetails'].sort());
  expect(Object.keys(view.explanationDetails).sort()).toEqual(['directArrangements', 'kind']);
  const direct = directExpenseArrangements(source);
  const exposed = view.explanationDetails.directArrangements;
  assertExactArrangementSet(exposed, direct);
  const order = exposed.map(({ currencyCode, debtorMemberId, creditorMemberId }) =>
    [currencyCode, debtorMemberId, creditorMemberId].join('\u0000'),
  );
  expect(order).toEqual([...order].sort());
  for (const arrangement of exposed)
    expect(Object.keys(arrangement).sort()).toEqual([
      'amount',
      'creditorMemberId',
      'currencyCode',
      'debtorMemberId',
    ]);

  assertSimplificationCountProjection(source, view);
  const candidate = independentNetCandidate(source);
  const selected = candidate.length <= direct.length ? candidate : direct;
  const unchanged =
    direct.length === selected.length &&
    direct.every((row) =>
      selected.some(
        (other) =>
          row.debtorMemberId === other.debtorMemberId &&
          row.creditorMemberId === other.creditorMemberId &&
          row.currencyCode === other.currencyCode &&
          independentSplittingOracle.equal(row.amount, other.amount),
      ),
    );
  expect(view.explanationDetails.kind).toBe(
    !view.simplifyDebts ? 'direct' : unchanged ? 'unchanged' : 'changed',
  );
  expect(await snapshotSplittingSources(world)).toEqual(source);

  return view;
}

When('owner 查詢可翻譯的結算說明', async ({ world }) => {
  await readTripSettlement(world, 'explanationDetails');
});

When('owner 查詢不支援的結算說明選項', async ({ world }) => {
  await captureSplittingRejectionBaseline(world);
  await callApi(world, 'GET', `/api/trips/${splittingTripId(world)}/settlement?include=unknown`);
});

Given('分帳旅行已有擁有者但查詢者未登入', async ({ world }) => {
  await seedSplittingExpenses(world, exampleExpenses);
  world.set('settlement-explanation:actor', null);
  await captureSplittingRejectionBaseline(world, null);
});

Given('分帳旅行已有擁有者且查詢者是其他帳號', async ({ world }) => {
  await seedSplittingExpenses(world, exampleExpenses);
  const other = await seedIdentity(world, '乙');
  expect(other.id).not.toBe(world.get('splitting:ownerId'));
  world.set('settlement-explanation:actor', '乙');
  await captureSplittingRejectionBaseline(world, other.id);
});

Given('擁有者的分帳旅行已在垃圾桶', async ({ world }) => {
  await seedSplittingExpenses(world, exampleExpenses);
  const ownerId = world.get<string>('splitting:ownerId');
  const tripId = splittingTripId(world);
  const result = await world.db.query(
    'UPDATE trips SET deleted_at=now(), lifecycle_revision=lifecycle_revision+1 WHERE id=$1 AND owner_id=$2',
    [tripId, ownerId],
  );
  expect(result.rowCount).toBe(1);
  world.set('settlement-explanation:actor', '甲');
  await captureSplittingRejectionBaseline(world, ownerId);
});

When('查詢者要求可翻譯的結算說明', async ({ world }) => {
  const actor = world.get<QueryActor>('settlement-explanation:actor');
  await callApi(
    world,
    'GET',
    `/api/trips/${splittingTripId(world)}/settlement?include=explanationDetails`,
    undefined,
    actor,
  );
});

Then('可翻譯結算查詢被拒絕為 {string}', async ({ world }, code: keyof typeof errorStatus) => {
  const response = world.response!;
  expect(response.status()).toBe(errorStatus[code]);
  const body = await response.json();
  expect(body).toMatchObject({ code });
  for (const field of ['balances', 'arrangements', 'explanationDetails'])
    expect(body).not.toHaveProperty(field);

  const source = world.splitting.snapshot!;
  const requester = world.get<string | null>('splitting:requestOwnerId');
  assertNoSplittingErrorDisclosure(body, source, [...world.users.values()], requester);
  expect(await snapshotSplittingSources(world)).toEqual(source);
  if (code !== 'TRIP_TRASHED') {
    await readTripSettlement(world);
    expect(world.get('splitting:revision')).toBe(String(source.trips[0]!.accounting_revision));
  }
});

Then('結算維持原有欄位及繁中說明', async ({ world }) => {
  const view = world.get<DeterministicSettlementView>('splitting:settlementView');
  const source = world.get<SourceSnapshot>('splitting:before');
  expect(Object.keys(view).sort()).toEqual([...originalFields].sort());
  assertSimplificationCountProjection(source, view);
  assertOriginalExplanation(view);
  expect(await snapshotSplittingSources(world)).toEqual(source);
});

Then('結算說明資料的類型為 {string}', async ({ world }, kind: ExplanationKind) => {
  const view = await assertExplanationProjection(world);
  expect(view.explanationDetails.kind).toBe(kind);
});

Then('說明中的原付款關係如下：', async ({ world }, table) => {
  const view = await assertExplanationProjection(world);
  const rows = table.hashes() as unknown as ExpenseArrangementRow[];
  const expected = rows.map((row) => ({
    debtorMemberId: splittingMemberId(world, row.付款人),
    creditorMemberId: splittingMemberId(world, row.收款人),
    currencyCode: row.幣別,
    amount: settlementTableAmount(row.金額),
  }));
  assertExactArrangementSet(view.explanationDetails.directArrangements, expected);
});

Then('付款筆數相同但說明資料的類型為 {string}', async ({ world }, kind: 'changed') => {
  const view = await assertExplanationProjection(world);
  expect(view.directArrangementCount).toBe(2);
  expect(view.suggestedArrangementCount).toBe(2);
  expect(view.explanationDetails.kind).toBe(kind);
});

Then('可翻譯說明與結算安排來自同一帳務版本', async ({ world }) => {
  const view = world.get<DeterministicSettlementView>('splitting:settlementView');
  const source = world.get<SourceSnapshot>('splitting:before');
  assertChangedExplanationProjection(source, view, {
    alice: splittingMemberId(world, 'Alice'),
    bob: splittingMemberId(world, 'Bob'),
    carol: splittingMemberId(world, 'Carol'),
  });
  const relationshipChange = view.explanation.match(
    /原本 (?<before>[^；]+)；現在 (?<after>[^，]+)，/u,
  );
  expect(relationshipChange?.groups?.before?.split('、').sort()).toEqual([
    'Alice 付款給 Bob',
    'Bob 付款給 Carol',
  ]);
  expect(relationshipChange?.groups?.after).toBe('Alice 付款給 Carol');
  assertOriginalExplanation(view);
  await assertExplanationProjection(world);
});
