import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { captureSplittingRejectionBaseline } from './rejection.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';

export const invalidExpenseUpdatePhrase = 'owner 嘗試以 {string} 修改既有共同支出';

export const invalidExpenseUpdateProblems = [
  '無分攤者',
  '重複分攤者',
  '停用付款人',
  '停用分攤者',
  '跨旅行付款人',
  '跨旅行分攤者',
] as const;

export type InvalidExpenseUpdateProblem = (typeof invalidExpenseUpdateProblems)[number];

type ExpenseMemberPatch = { payerMemberId: string } | { shareMemberIds: string[] };

/** PATCH is partial: send only the invalid member field, preserving every omitted field. */
export function invalidExpenseUpdateRequest(
  problem: string,
  ids: { amyId: string; carolId: string; davidId: string },
): ExpenseMemberPatch {
  switch (problem) {
    case '無分攤者':
      return { shareMemberIds: [] };
    case '重複分攤者':
      return { shareMemberIds: [ids.amyId, ids.amyId] };
    case '停用付款人':
      return { payerMemberId: ids.carolId };
    case '停用分攤者':
      return { shareMemberIds: [ids.carolId] };
    case '跨旅行付款人':
      return { payerMemberId: ids.davidId };
    case '跨旅行分攤者':
      return { shareMemberIds: [ids.davidId] };
    default:
      throw new Error(`Unsupported expense update validation problem: ${problem}`);
  }
}

export async function updateInvalidExpense(world: LedgerWorld, problem: string): Promise<void> {
  const request = invalidExpenseUpdateRequest(problem, {
    amyId: splittingMemberId(world, 'Amy'),
    carolId: splittingMemberId(world, 'Carol'),
    davidId: splittingMemberId(world, 'David'),
  });
  const tripId = splittingTripId(world);
  const expenseId = world.splitting.ids.expenses.get('晚餐');
  expect(expenseId, 'Given must identify the existing shared dinner expense').toBeDefined();
  const owner = world.users.get('甲');
  expect(owner, 'The update must use the owner session').toBeDefined();
  await captureSplittingRejectionBaseline(world);
  const before = world.splitting.snapshot!;
  expect(before.expenses.find((row) => row.id === expenseId)).toBeDefined();
  world.set('splitting:expenseValidationProblem', problem);
  world.set(
    'splitting:expectedRejectionCode',
    problem.startsWith('跨旅行') ? 'NOT_FOUND' : 'VALIDATION_ERROR',
  );
  world.set('splitting:expenseId', expenseId);
  world.set('splitting:expenseRequest', request);
  world.set('splitting:before', before);
  world.response = await world.api.patch(`/api/trips/${tripId}/expenses/${expenseId}`, {
    headers: { Cookie: owner!.cookie, Origin: world.get<string>('webOrigin') },
    data: request,
  });
  world.set('splitting:reply', await world.response.json());
}
