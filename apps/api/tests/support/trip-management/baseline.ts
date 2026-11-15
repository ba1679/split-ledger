import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import sharp from 'sharp';
import type { LedgerWorld } from '../world.js';
import {
  callApi,
  requireProductTable,
  seedCategory,
  seedExpense,
  seedIdentity,
  seedTrip,
} from '../seed.js';
import { requireProductColumns } from '../splitting/schema.js';
import {
  independentSplittingOracle,
  snapshotSplittingSources,
} from '../splitting/expense-fixture.js';
import type { TripManagementSnapshot } from './context.js';

export const lifecycleStates = ['一般可用', '垃圾桶', '已永久刪除'] as const;

export type LifecycleBaseline = (typeof lifecycleStates)[number];

export function managementTripId(world: LedgerWorld): string {
  const id = world.tripManagement.ids.trips.get('日本旅行');

  expect(id, 'Lifecycle Given must establish a stable trip UUID').toBeDefined();

  return id!;
}

export async function managementSnapshot(
  world: LedgerWorld,
  tripId = managementTripId(world),
): Promise<TripManagementSnapshot> {
  const sources = await snapshotSplittingSources(world, tripId);
  const extra: Record<string, Record<string, unknown>[]> = {};
  for (const [key, table] of [
    ['thumbnails', 'trip_thumbnails'],
    ['reservations', 'trip_id_reservations'],
    ['receipts', 'trip_operation_receipts'],
  ] as const) {
    await requireProductTable(world, table);
    extra[key] = (
      await world.db.query(
        `SELECT * FROM ${table} WHERE trip_id=$1 ORDER BY to_jsonb(${table})::text`,
        [tripId],
      )
    ).rows;
  }
  extra.categories = (
    await world.db.query('SELECT * FROM categories WHERE owner_id=ANY($1::text[]) ORDER BY id', [
      [...world.users.values()].map((user) => user.id),
    ])
  ).rows;

  return { ...sources, ...extra } as TripManagementSnapshot;
}

export async function sharedSnapshot(world: LedgerWorld) {
  const otherId = world.tripManagement.ids.trips.get('台南旅行');

  expect(otherId).toBeDefined();
  const other = await managementSnapshot(world, otherId!);
  const outsider = await managementSnapshot(world, world.tripManagement.ids.trips.get('私人旅行')!);
  const users = (
    await world.db.query('SELECT * FROM auth."user" WHERE id=ANY($1::text[]) ORDER BY id', [
      [...world.users.values()].map((user) => user.id),
    ])
  ).rows;
  const currencies = (await world.db.query('SELECT * FROM currencies ORDER BY code')).rows;

  return { other, outsider, users, currencies };
}

/** All rows go through production constraints; no test-created schema or disabled triggers. */
export async function seedLifecycleBaseline(world: LedgerWorld, state: string): Promise<void> {
  expect(lifecycleStates).toContain(state);
  await requireProductColumns(world, 'trips', [
    'deleted_at',
    'lifecycle_revision',
    'thumbnail_revision',
  ]);
  for (const table of ['trip_thumbnails', 'trip_id_reservations', 'trip_operation_receipts'])
    await requireProductTable(world, table);
  const alice = await seedIdentity(world, 'Alice');
  await seedIdentity(world, 'Carol');
  const trip = await seedTrip(world, '日本旅行', 'Alice', {
    startDate: '2027-03-10',
    endDate: '2027-03-15',
  });
  const other = await seedTrip(world, '台南旅行', 'Alice');
  const outsider = await seedTrip(world, '私人旅行', 'Carol');
  const category = await seedCategory(world, '餐飲', 'Alice');
  await seedExpense(world, {
    owner: 'Alice',
    tripName: '台南旅行',
    item: '台南午餐',
    amount: '150',
    currencyCode: 'TWD',
  });
  await seedExpense(world, {
    owner: 'Carol',
    tripName: '私人旅行',
    item: '私人午餐',
    amount: '200',
    currencyCode: 'TWD',
  });
  const mountain = await sharp({
    create: {
      width: 64,
      height: 48,
      channels: 3,
      background: '#6d8fac',
    },
  })
    .webp()
    .toBuffer();
  const otherImage = await sharp({
    create: {
      width: 48,
      height: 32,
      channels: 3,
      background: '#d0a26c',
    },
  })
    .webp()
    .toBuffer();
  const members = { Alice: '', Amy: randomUUID(), Bob: randomUUID(), Charlie: randomUUID() };
  const existingOwner = await world.db.query<{ id: string }>(
    "SELECT id FROM trip_members WHERE trip_id=$1 AND role='owner'",
    [trip.id],
  );

  expect(existingOwner.rows).toHaveLength(1);
  members.Alice = existingOwner.rows[0]!.id;
  const expenses = [
    {
      name: '晚餐',
      amount: '3000',
      currency: 'JPY',
      payer: members.Alice,
      shares: [members.Alice, members.Amy, members.Bob],
    },
    {
      name: '住宿',
      amount: '2000',
      currency: 'JPY',
      payer: members.Amy,
      shares: [members.Alice, members.Amy],
    },
    {
      name: '車資',
      amount: '60000',
      currency: 'TWD',
      payer: members.Alice,
      shares: [members.Alice, members.Amy],
    },
  ];
  const independent = randomUUID(),
    settlement = randomUUID(),
    payment = randomUUID();
  const client = await world.db.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE trips SET simplify_debts=true, accounting_revision=7, thumbnail_revision=1 WHERE id=$1',
      [trip.id],
    );
    for (const name of ['Amy', 'Bob', 'Charlie'] as const)
      await client.query(
        "INSERT INTO trip_members(id,owner_id,trip_id,role,name,is_active) VALUES($1,$2,$3,'companion',$4,true)",
        [members[name], alice.id, trip.id, name],
      );
    for (const expense of expenses) {
      const id = randomUUID();
      await client.query(
        'INSERT INTO expenses(id,owner_id,trip_id,payer_member_id,category_id,item,amount_minor,currency_code,minor_unit,spent_on) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
        [
          id,
          alice.id,
          trip.id,
          expense.payer,
          expense.name === '晚餐' ? category.id : null,
          expense.name,
          expense.amount,
          expense.currency,
          expense.currency === 'JPY' ? 0 : 2,
          '2027-03-11',
        ],
      );
      for (const member of expense.shares)
        await client.query(
          'INSERT INTO expense_shares(owner_id,trip_id,expense_id,member_id) VALUES($1,$2,$3,$4)',
          [alice.id, trip.id, id, member],
        );
      world.splitting.ids.expenses.set(expense.name, id);
    }
    await client.query(
      "INSERT INTO repayments(id,owner_id,trip_id,payer_member_id,payee_member_id,amount_minor,currency_code,minor_unit,paid_on,kind) VALUES($1,$2,$3,$4,$5,200,'JPY',0,'2027-03-12','independent')",
      [independent, alice.id, trip.id, members.Bob, members.Alice],
    );
    await client.query(
      "INSERT INTO settlements(id,owner_id,trip_id,debtor_member_id,creditor_member_id,currency_code,obligation_numerator,obligation_denominator,obligation_minor_unit,arrangement_key,source_revision,simplify_debts) VALUES($1,$2,$3,$4,$5,'JPY',800,1,0,$6,6,true)",
      [settlement, alice.id, trip.id, members.Bob, members.Alice, `baseline-${settlement}`],
    );
    await client.query(
      "INSERT INTO repayments(id,owner_id,trip_id,payer_member_id,payee_member_id,amount_minor,currency_code,minor_unit,paid_on,kind,settlement_id) VALUES($1,$2,$3,$4,$5,800,'JPY',0,'2027-03-13','settlement',$6)",
      [payment, alice.id, trip.id, members.Bob, members.Alice, settlement],
    );
    for (const member of [members.Bob, members.Alice])
      await client.query(
        "INSERT INTO settlement_adjustments(settlement_id,owner_id,trip_id,member_id,currency_code,numerator,denominator,minor_unit) VALUES($1,$2,$3,$4,'JPY',0,1,0)",
        [settlement, alice.id, trip.id, member],
      );
    // Historical payments precede deactivation; do not weaken the active-member guard.
    await client.query('UPDATE trip_members SET is_active=false WHERE id=$1', [members.Bob]);
    for (const [id, bytes, width, height] of [
      [trip.id, otherImage, 48, 32],
      [other.id, otherImage, 48, 32],
    ] as const)
      await client.query(
        'INSERT INTO trip_thumbnails(owner_id,trip_id,image_webp,width,height,updated_at) VALUES($1,$2,$3,$4,$5,now())',
        [alice.id, id, bytes, width, height],
      );
    await client.query('UPDATE trips SET thumbnail_revision=1 WHERE id=$1', [other.id]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  // Commit an actual prior custom image before replacing it during fixture setup.
  // Reads of an old version must use a revision that really existed.
  const previous = await world.db.query<{ thumbnail_revision: string }>(
    'SELECT thumbnail_revision FROM trips WHERE id=$1',
    [trip.id],
  );
  world.set('management:previousThumbnailRevision', String(previous.rows[0]!.thumbnail_revision));
  const replacement = await world.db.connect();
  try {
    await replacement.query('BEGIN');
    await replacement.query(
      'UPDATE trip_thumbnails SET image_webp=$2,width=64,height=48,updated_at=now() WHERE trip_id=$1',
      [trip.id, mountain],
    );
    await replacement.query(
      'UPDATE trips SET thumbnail_revision=thumbnail_revision+1 WHERE id=$1',
      [trip.id],
    );
    await replacement.query('COMMIT');
  } catch (error) {
    await replacement.query('ROLLBACK');
    throw error;
  } finally {
    replacement.release();
  }
  world.tripManagement.ids.trips.set('日本旅行', trip.id);
  world.tripManagement.ids.trips.set('台南旅行', other.id);
  world.tripManagement.ids.trips.set('私人旅行', outsider.id);
  world.splitting.ids.trips.set('日本旅行', trip.id);
  for (const [name, id] of Object.entries(members)) world.splitting.ids.members.set(name, id);
  world.splitting.ids.repayments.set('獨立還款', independent);
  world.splitting.ids.repayments.set('結清付款', payment);
  world.splitting.ids.settlements.set('結清', settlement);
  // Preserve an actual previously valid form before arranging the trash state.
  const arrangementResponse = await world.api.get(`/api/trips/${trip.id}/settlement`, {
    headers: { cookie: alice.cookie },
  });

  expect(arrangementResponse.status()).toBe(200);
  const view = await arrangementResponse.json();
  const arrangement = view.arrangements.find(
    (row: { currencyCode: string; debtorMemberId: string; creditorMemberId: string }) =>
      row.currencyCode === 'TWD' &&
      row.debtorMemberId === members.Amy &&
      row.creditorMemberId === members.Alice,
  );

  expect(arrangement).toBeDefined();
  expect(arrangement.amount).toEqual({ numerator: '30000', denominator: '1', minorUnit: 2 });
  world.set('management:validSettlementRequest', {
    id: randomUUID(),
    repaymentId: randomUUID(),
    arrangementKey: arrangement.key,
    accountingRevision: view.accountingRevision,
    debtorMemberId: members.Amy,
    creditorMemberId: members.Alice,
    currencyCode: 'TWD',
    expectedAmount: arrangement.amount,
    paidAmount: '300',
    paidOn: '2027-03-14',
  });
  if (state !== '一般可用')
    await world.db.query('UPDATE trips SET deleted_at=now(),lifecycle_revision=1 WHERE id=$1', [
      trip.id,
    ]);
  const before = await managementSnapshot(world);

  expect(before.members).toHaveLength(4);
  expect(before.expenses).toHaveLength(3);
  expect(before.shares).toHaveLength(7);
  expect(before.repayments).toHaveLength(2);
  expect(before.settlements).toHaveLength(1);
  expect(before.adjustments).toHaveLength(2);
  expect(before.thumbnails).toHaveLength(1);
  expect(before.reservations).toHaveLength(1);
  for (const member of Object.values(members))
    expect(independentSplittingOracle.balance(before, member, 'JPY').numerator).toBe('0');
  expect(independentSplittingOracle.balance(before, members.Amy, 'TWD')).toEqual({
    numerator: '-30000',
    denominator: '1',
    minorUnit: 2,
  });
  expect(independentSplittingOracle.balance(before, members.Alice, 'TWD')).toEqual({
    numerator: '30000',
    denominator: '1',
    minorUnit: 2,
  });
  world.set(
    'management:prePurgeThumbnailUrl',
    `/api/trips/trash/${trip.id}/thumbnail/${String(before.trips[0]!.thumbnail_revision)}`,
  );
  world.set('management:originalSources', before);
  world.set('management:originalImage', mountain);
  const unknownExpenseId = randomUUID();

  expect(
    (await world.db.query('SELECT id FROM expenses WHERE id=$1', [unknownExpenseId])).rows,
  ).toEqual([]);
  world.set('management:unknownExpenseId', unknownExpenseId);
  if (state === '已永久刪除') {
    // A purged baseline uses the real product command, never manufactured success receipts.
    const operationId = randomUUID();
    const response = await callApi(
      world,
      'POST',
      `/api/trips/${trip.id}/purge`,
      {
        operationId,
        expectedLifecycleRevision: String(before.trips[0]!.lifecycle_revision),
      },
      'Alice',
    );

    expect(response.status(), 'Purged Given needs the production purge capability').toBe(200);
    const purged = await managementSnapshot(world);
    for (const key of [
      'trips',
      'members',
      'expenses',
      'shares',
      'repayments',
      'settlements',
      'adjustments',
      'thumbnails',
    ] as const)
      expect(purged[key], `Purged baseline must contain no ${key}`).toEqual([]);
    expect(purged.reservations[0]!.purged_at).not.toBeNull();
    expect(purged.receipts).toHaveLength(1);
    expect(purged.receipts[0]).toMatchObject({
      operation_id: operationId,
      kind: 'purge',
      result_state: 'purged',
    });
  }
  const snapshot = await managementSnapshot(world);

  world.tripManagement.snapshot = snapshot;
  world.set('management:before', snapshot);
  world.set('management:sharedBefore', await sharedSnapshot(world));
  const row = snapshot.trips[0];

  world.tripManagement.versions.set(trip.id, {
    lifecycle: BigInt(
      String(row?.lifecycle_revision ?? snapshot.receipts[0]!.result_lifecycle_revision),
    ),
    thumbnail: BigInt(
      String(row?.thumbnail_revision ?? snapshot.receipts[0]!.result_thumbnail_revision),
    ),
    accounting: BigInt(String(row?.accounting_revision ?? 7)),
  });
}
