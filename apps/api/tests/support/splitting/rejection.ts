import { expect } from '@playwright/test';
import type { Identity, LedgerWorld } from '../world.js';
import type { SourceSnapshot } from './types.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';

export const splittingRejectionStatus = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  NOT_FOUND: 404,
  MEMBER_NAME_CONFLICT: 409,
  MEMBER_IN_USE: 409,
  ACCOUNTING_REVISION_CONFLICT: 409,
  ARRANGEMENT_NOT_FOUND: 409,
  ID_CONFLICT: 409,
} as const;

export type SplittingRejectionCode = keyof typeof splittingRejectionStatus;

export function assertSplittingRejectionCode(code: string): asserts code is SplittingRejectionCode {
  expect(
    Object.hasOwn(splittingRejectionStatus, code),
    'DSL error parameter must be supported',
  ).toBe(true);
}

function decimal(row: Record<string, unknown>): string {
  const unit = Number(row.minor_unit);
  const digits = String(row.amount_minor).padStart(unit + 1, '0');

  return unit ? `${digits.slice(0, -unit)}.${digits.slice(-unit)}` : digits;
}

/** Called immediately before the unique command, including commands following fixture mutations. */
export async function captureSplittingRejectionBaseline(
  world: LedgerWorld,
  requestOwnerId: string | null = world.get<string>('splitting:ownerId'),
): Promise<void> {
  world.splitting.snapshot = await snapshotSplittingSources(world);
  world.set('splitting:requestOwnerId', requestOwnerId);
}

function stringLeaves(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringLeaves);
  if (value && typeof value === 'object') return Object.values(value).flatMap(stringLeaves);

  return [];
}

export async function assertRejectedSplittingOperation(
  world: LedgerWorld,
  code: string,
): Promise<void> {
  assertSplittingRejectionCode(code);
  expect(world.response, 'The unique command must record its response').toBeDefined();
  expect(world.response!.status()).toBe(splittingRejectionStatus[code]);
  const body: unknown = await world.response!.json();
  expect(body).toMatchObject({ code });
  const before = world.splitting.snapshot;
  expect(before, 'When must capture the complete authoritative pre-command snapshot').toBeDefined();
  const source = before!;
  const requestOwnerId = world.state.has('splitting:requestOwnerId')
    ? world.get<string | null>('splitting:requestOwnerId')
    : world.get<string>('splitting:ownerId');
  assertNoSplittingErrorDisclosure(body, source, [...world.users.values()], requestOwnerId);
  const sessions = await world.db.query<{ token: string }>(
    'SELECT token FROM auth.session WHERE user_id = ANY($1::text[])',
    [[...world.users.values()].map((identity) => identity.id)],
  );
  for (const session of sessions.rows)
    expect(JSON.stringify(body), 'Error must not disclose session tokens').not.toContain(
      session.token,
    );
  expect(await snapshotSplittingSources(world)).toEqual(source);
  await assertOwnerCanReadUnchangedSources(world, source);
  expect(
    await snapshotSplittingSources(world),
    'Confirmation reads must leave source and revision untouched',
  ).toEqual(source);
}

/** Public error explanations may reference the requesting owner's own data. */
export function assertNoSplittingErrorDisclosure(
  body: unknown,
  source: SourceSnapshot,
  identities: readonly Identity[],
  requestOwnerId: string | null,
): void {
  const text = JSON.stringify(body);
  const foreignRows = Object.values(source)
    .flat()
    .filter((row) => row.owner_id !== requestOwnerId);
  const protectedStrings = new Set<string>();
  for (const row of foreignRows) {
    for (const [key, value] of Object.entries(row)) {
      if (
        (key === 'id' || key.endsWith('_id') || key === 'name' || key === 'item') &&
        typeof value === 'string'
      )
        protectedStrings.add(value);
    }
  }
  for (const identity of identities) {
    if (identity.id !== requestOwnerId) {
      protectedStrings.add(identity.id);
      protectedStrings.add(identity.name);
    }
    protectedStrings.add(identity.cookie);
  }
  for (const secret of protectedStrings)
    expect(text, 'Error must not disclose another owner identity or any session').not.toContain(
      secret,
    );
  const leaves = stringLeaves(body);
  for (const row of foreignRows.filter((row) => row.amount_minor !== undefined)) {
    const amount = decimal(row);
    expect(leaves, 'Error must not disclose another owner amounts').not.toContain(amount);
    expect(text).not.toMatch(
      new RegExp(`${row.currency_code}\\s+${amount.replace('.', '\\.')}\\b`),
    );
  }
}

async function assertOwnerCanReadUnchangedSources(
  world: LedgerWorld,
  source: SourceSnapshot,
): Promise<void> {
  const tripId = splittingTripId(world);
  const ownerId = String(source.trips[0]!.owner_id);
  const owner = [...world.users.values()].find((identity) => identity.id === ownerId);
  expect(
    owner,
    'Fixture must retain the actual owner session for confirmation reads',
  ).toBeDefined();
  const read = async (suffix: string) => {
    const response = await world.api.get(`/api/trips/${tripId}${suffix}`, {
      headers: { Cookie: owner!.cookie },
    });
    expect(response.status(), `Owner confirmation GET ${suffix || '/trip'} must be available`).toBe(
      200,
    );

    return response.json() as Promise<Record<string, unknown>>;
  };
  const trip = await read('');
  expect(trip).toMatchObject({
    id: tripId,
    accountingRevision: String(source.trips[0]!.accounting_revision),
    simplifyDebts: source.trips[0]!.simplify_debts,
  });
  for (const [suffix, rows, projection] of [
    [
      '/members',
      source.members,
      (row: Record<string, unknown>) => ({
        id: row.id,
        tripId,
        name: row.name,
        role: row.role,
        isActive: row.is_active,
      }),
    ],
    [
      '/expenses',
      source.expenses,
      (row: Record<string, unknown>) => ({
        id: row.id,
        tripId,
        item: row.item,
        payerMemberId: row.payer_member_id,
        currencyCode: row.currency_code,
        amount: decimal(row),
      }),
    ],
    [
      '/repayments',
      source.repayments,
      (row: Record<string, unknown>) => ({
        id: row.id,
        tripId,
        payerMemberId: row.payer_member_id,
        payeeMemberId: row.payee_member_id,
        currencyCode: row.currency_code,
        amount: decimal(row),
        kind: row.kind,
        settlementId: row.settlement_id,
      }),
    ],
  ] as const) {
    const result = await read(suffix);
    expect(result.items).toHaveLength(rows.length);
    expect(result.items).toEqual(
      expect.arrayContaining(rows.map((row) => expect.objectContaining(projection(row)))),
    );
  }
}
