import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { Identity, LedgerWorld } from '../world.js';
import type { AccessArrangement, AccessSettlementView } from './access-fixture.js';
import { splittingTripId } from './members-fixture.js';
import { captureSplittingRejectionBaseline } from './rejection.js';

export const unauthorizedOperations = [
  '列成員',
  '讀成員',
  '新增成員',
  '改成員',
  '刪成員',
  '讀共同支出',
  '改共同支出',
  '刪共同支出',
  '讀結算',
  '切換簡化',
  '讀還款',
  '新增還款',
  '讀結清',
  '新增結清',
] as const;

export interface UnauthorizedRequestFixture {
  tripId: string;
  memberId: string;
  expenseId: string;
  repaymentId: string;
  settlementId: string;
  arrangement: AccessArrangement;
  view: AccessSettlementView;
  createId: string;
  createRepaymentId: string;
}

export function unauthorizedSplittingRequest(
  fixture: UnauthorizedRequestFixture,
  foreign: Identity,
  origin: string,
  operation: string,
) {
  const root = `/api/trips/${fixture.tripId}`;
  const arrangement = fixture.arrangement;
  const commands = {
    列成員: { method: 'GET', path: '/members' },
    讀成員: { method: 'GET', path: `/members/${fixture.memberId}` },
    新增成員: { method: 'POST', path: '/members', data: { id: fixture.createId, name: 'Charlie' } },
    改成員: {
      method: 'PATCH',
      path: `/members/${fixture.memberId}`,
      data: { name: 'Renamed Amy' },
    },
    刪成員: { method: 'DELETE', path: `/members/${fixture.memberId}` },
    讀共同支出: { method: 'GET', path: `/expenses/${fixture.expenseId}` },
    改共同支出: {
      method: 'PATCH',
      path: `/expenses/${fixture.expenseId}`,
      data: { item: 'Updated lunch' },
    },
    刪共同支出: { method: 'DELETE', path: `/expenses/${fixture.expenseId}` },
    讀結算: { method: 'GET', path: '/settlement' },
    切換簡化: { method: 'PATCH', path: '', data: { simplifyDebts: !fixture.view.simplifyDebts } },
    讀還款: { method: 'GET', path: `/repayments/${fixture.repaymentId}` },
    新增還款: {
      method: 'POST',
      path: '/repayments',
      data: {
        id: fixture.createId,
        payerMemberId: arrangement.debtorMemberId,
        payeeMemberId: arrangement.creditorMemberId,
        amount: '1',
        currencyCode: arrangement.currencyCode,
        paidOn: '2027-01-21',
      },
    },
    讀結清: { method: 'GET', path: `/settlements/${fixture.settlementId}` },
    新增結清: {
      method: 'POST',
      path: '/settlements',
      data: {
        id: fixture.createId,
        repaymentId: fixture.createRepaymentId,
        arrangementKey: arrangement.key,
        accountingRevision: fixture.view.accountingRevision,
        debtorMemberId: arrangement.debtorMemberId,
        creditorMemberId: arrangement.creditorMemberId,
        currencyCode: arrangement.currencyCode,
        expectedAmount: arrangement.amount,
        paidAmount: '1',
        paidOn: '2027-01-21',
      },
    },
  } as const;
  expect(
    Object.hasOwn(commands, operation),
    'Operation must match the fourteen-value DSL enum',
  ).toBe(true);
  const command = commands[operation as keyof typeof commands];

  return {
    url: root + command.path,
    options: {
      method: command.method,
      headers: { Cookie: foreign.cookie, ...(command.method !== 'GET' ? { Origin: origin } : {}) },
      ...('data' in command ? { data: command.data } : {}),
    },
  };
}

export async function requestUnauthorizedSplittingResource(
  world: LedgerWorld,
  operation: string,
): Promise<void> {
  const foreign = world.get<Identity>('splitting:accessForeign');
  const fixture: UnauthorizedRequestFixture = {
    tripId: splittingTripId(world),
    memberId: world.get<string>('splitting:accessMemberId'),
    expenseId: world.get<string>('splitting:accessExpenseId'),
    repaymentId: world.get<string>('splitting:accessRepaymentId'),
    settlementId: world.get<string>('splitting:settlementId'),
    arrangement: world.get<AccessArrangement>('splitting:accessArrangement'),
    view: world.get<AccessSettlementView>('splitting:accessView'),
    createId: randomUUID(),
    createRepaymentId: randomUUID(),
  };
  const request = unauthorizedSplittingRequest(
    fixture,
    foreign,
    world.get<string>('webOrigin'),
    operation,
  );
  await captureSplittingRejectionBaseline(world, foreign.id);
  world.set('splitting:unauthorizedOperation', operation);
  world.set('splitting:unauthorizedRequest', request);
  world.response = await world.api.fetch(request.url, request.options);
}
