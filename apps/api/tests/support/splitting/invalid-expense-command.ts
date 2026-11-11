import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import { captureSplittingRejectionBaseline } from './rejection.js';

export const invalidExpensePhrase = 'owner 嘗試以 {string} 保存共同支出';

export const invalidExpenseProblems = [
  '只有付款人',
  '只有分攤者',
  '無分攤者',
  '重複分攤者',
  '停用付款人',
  '停用分攤者',
  '跨旅行付款人',
  '跨旅行分攤者',
] as const;

export function invalidExpenseRequest(
  problem: string,
  id: string,
  members: Record<'Alice' | 'Amy' | 'Carol' | 'David', string>,
): Record<string, unknown> {
  expect(invalidExpenseProblems as readonly string[], 'DSL problem must be supported').toContain(
    problem,
  );
  const request: Record<string, unknown> = {
    id,
    item: '點心',
    currencyCode: 'JPY',
    amount: '100',
    spentOn: '2027-01-20',
    categoryId: null,
    payerMemberId: members.Alice,
    shareMemberIds: [members.Amy],
  };
  switch (problem) {
    case '只有付款人':
      delete request.shareMemberIds;
      break;
    case '只有分攤者':
      delete request.payerMemberId;
      break;
    case '無分攤者':
      request.shareMemberIds = [];
      break;
    case '重複分攤者':
      request.shareMemberIds = [members.Amy, members.Amy];
      break;
    case '停用付款人':
      request.payerMemberId = members.Carol;
      break;
    case '停用分攤者':
      request.shareMemberIds = [members.Carol];
      break;
    case '跨旅行付款人':
      request.payerMemberId = members.David;
      break;
    case '跨旅行分攤者':
      request.shareMemberIds = [members.David];
      break;
  }

  return request;
}

/** Invalid input is deliberately sent to the real endpoint without client validation. */
export async function requestInvalidSharedExpense(
  world: LedgerWorld,
  problem: string,
): Promise<void> {
  const tripId = splittingTripId(world);
  const id = randomUUID();
  const request = invalidExpenseRequest(problem, id, {
    Alice: splittingMemberId(world, 'Alice'),
    Amy: splittingMemberId(world, 'Amy'),
    Carol: splittingMemberId(world, 'Carol'),
    David: splittingMemberId(world, 'David'),
  });
  await captureSplittingRejectionBaseline(world);
  world.set('splitting:before', world.splitting.snapshot);
  world.set('splitting:expenseId', id);
  world.set('splitting:expenseRequest', request);
  world.set('splitting:expenseValidationProblem', problem);
  world.set(
    'splitting:expectedRejectionCode',
    problem.startsWith('跨旅行') ? 'NOT_FOUND' : 'VALIDATION_ERROR',
  );
  world.response = await world.api.post(`/api/trips/${tripId}/expenses`, {
    headers: { Cookie: world.users.get('甲')!.cookie, Origin: world.get<string>('webOrigin') },
    data: request,
  });
  world.set('splitting:reply', await world.response.json());
}
