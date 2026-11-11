import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { assertRejectedSplittingOperation } from './rejection.js';
import { splittingTripId } from './members-fixture.js';

export const unauthenticatedSettlementResultPhrase = '分帳結算回覆未登入且不揭露帳務';

export function assertUnauthenticatedSettlementBody(body: unknown): void {
  expect(body).toMatchObject({ code: 'UNAUTHENTICATED' });
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      expect(
        key,
        'Unauthenticated errors must not contain accounting or identity fields',
      ).not.toMatch(
        /member|balance|arrangement|email|session|token|cookie|owner|expense|repayment|settlement|adjustment/i,
      );
      visit(child);
    }
  };
  visit(body);
}

export async function assertUnauthenticatedSettlementResult(world: LedgerWorld): Promise<void> {
  expect(world.get('splitting:requestOwnerId')).toBeNull();
  expect(world.response, 'The unique unauthenticated read must record its response').toBeDefined();
  assertUnauthenticatedSettlementBody(await world.response!.json());
  const text = JSON.stringify(await world.response!.json());
  for (const identity of world.users.values()) expect(text).not.toContain(identity.email);
  await assertRejectedSplittingOperation(world, 'UNAUTHENTICATED');

  const memberIds = [...world.splitting.ids.members.values()];
  const identities = await world.db.query(
    'SELECT id FROM auth."user" WHERE id LIKE $1 OR id=ANY($2::text[]) ORDER BY id',
    [`${world.namespace}%`, memberIds],
  );
  expect(identities.rows.map((row) => row.id)).toEqual(
    [...world.users.values()].map((identity) => identity.id).sort(),
  );
  for (const table of ['session', 'account']) {
    const rows = await world.db.query(
      `SELECT user_id FROM auth.${table} WHERE user_id LIKE $1 OR user_id=ANY($2::text[])`,
      [`${world.namespace}%`, memberIds],
    );
    expect(rows.rows).toHaveLength(world.users.size);
    expect(
      rows.rows.every((row) => [...world.users.values()].some((user) => user.id === row.user_id)),
    ).toBe(true);
  }
  const members = await world.db.query('SELECT * FROM trip_members WHERE trip_id=$1', [
    splittingTripId(world),
  ]);
  expect(members.rows).toHaveLength(memberIds.length);
  for (const row of members.rows)
    for (const key of Object.keys(row))
      expect(key, 'Companion records must not grant authentication or ACL credentials').not.toMatch(
        /^(?:user_id|account_id|session_id|acl|permissions|access_token|token|cookie)$/i,
      );
}
