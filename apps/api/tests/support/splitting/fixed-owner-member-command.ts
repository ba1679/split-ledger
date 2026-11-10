import type { LedgerWorld } from '../world.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import { captureSplittingRejectionBaseline } from './rejection.js';

export const fixedOwnerMemberPhrase = 'owner 嘗試對自己的固定成員執行 {string}';

export function fixedOwnerMemberRequest(
  operation: string,
): { method: 'PATCH'; data: { name: string } | { isActive: false } } | { method: 'DELETE' } {
  switch (operation) {
    case '改名':
      return { method: 'PATCH', data: { name: '新的名稱' } };
    case '停用':
      return { method: 'PATCH', data: { isActive: false } };
    case '刪除':
      return { method: 'DELETE' };
    default:
      throw Error(`Unsupported fixed owner member operation: ${operation}`);
  }
}

/** Select exactly one forbidden mutation of the existing owner member. */
export async function requestFixedOwnerMemberMutation(
  world: LedgerWorld,
  operation: string,
): Promise<void> {
  const command = fixedOwnerMemberRequest(operation);
  const memberId = splittingMemberId(world, 'owner');
  const path = `/api/trips/${splittingTripId(world)}/members/${memberId}`;
  await captureSplittingRejectionBaseline(world);
  world.set('splitting:before', world.splitting.snapshot);
  world.set('splitting:memberId', memberId);
  world.set('splitting:memberOperation', operation);
  world.set('splitting:expectedRejectionCode', 'VALIDATION_ERROR');
  const headers = {
    Cookie: world.users.get('甲')!.cookie,
    Origin: world.get<string>('webOrigin'),
  };
  world.response =
    command.method === 'DELETE'
      ? await world.api.delete(path, { headers })
      : await world.api.patch(path, { headers, data: command.data });
  const text = await world.response.text();
  world.set('splitting:reply', text ? JSON.parse(text) : null);
}
