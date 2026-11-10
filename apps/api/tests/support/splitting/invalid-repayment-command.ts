import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import { captureSplittingRejectionBaseline } from './rejection.js';

export const invalidRepaymentPhrase = 'owner 嘗試記錄 {string} 的獨立還款';

export const invalidRepaymentProblems = [
  '本人付本人',
  '非正數',
  '無效幣別',
  '無效日期',
  '停用付款人',
  '停用收款人',
  '跨旅行付款人',
  '跨旅行收款人',
] as const;

export function invalidRepaymentRequest(
  problem: string,
  id: string,
  members: Record<'Alice' | 'Amy' | 'Carol' | 'David', string>,
): Record<string, unknown> {
  expect(invalidRepaymentProblems as readonly string[], 'DSL problem must be supported').toContain(
    problem,
  );
  const request: Record<string, unknown> = {
    id,
    payerMemberId: members.Amy,
    payeeMemberId: members.Alice,
    amount: '100',
    currencyCode: 'JPY',
    paidOn: '2027-01-20',
  };
  switch (problem) {
    case '本人付本人':
      request.payeeMemberId = members.Amy;
      break;
    case '非正數':
      request.amount = '0';
      break;
    case '無效幣別':
      request.currencyCode = 'ZZZ';
      break;
    case '無效日期':
      request.paidOn = '2027-02-30';
      break;
    case '停用付款人':
      request.payerMemberId = members.Carol;
      break;
    case '停用收款人':
      request.payeeMemberId = members.Carol;
      break;
    case '跨旅行付款人':
      request.payerMemberId = members.David;
      break;
    case '跨旅行收款人':
      request.payeeMemberId = members.David;
      break;
  }

  return request;
}

/** The command submits the invalid field to the real API exactly once. */
export async function requestInvalidRepayment(world: LedgerWorld, problem: string): Promise<void> {
  const tripId = splittingTripId(world);
  const id = randomUUID();
  const request = invalidRepaymentRequest(problem, id, {
    Alice: splittingMemberId(world, 'Alice'),
    Amy: splittingMemberId(world, 'Amy'),
    Carol: splittingMemberId(world, 'Carol'),
    David: splittingMemberId(world, 'David'),
  });
  await captureSplittingRejectionBaseline(world);
  world.set('splitting:before', world.splitting.snapshot);
  world.set('splitting:repaymentId', id);
  world.set('splitting:repaymentRequest', request);
  world.set('splitting:repaymentValidationProblem', problem);
  world.set(
    'splitting:expectedRejectionCode',
    problem.startsWith('跨旅行') ? 'NOT_FOUND' : 'VALIDATION_ERROR',
  );
  world.response = await world.api.post(`/api/trips/${tripId}/repayments`, {
    headers: { Cookie: world.users.get('甲')!.cookie, Origin: world.get<string>('webOrigin') },
    data: request,
  });
  world.set('splitting:reply', await world.response.json());
}
