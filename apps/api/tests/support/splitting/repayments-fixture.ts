import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { requireProductColumns } from './schema.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import {
  fixtureMinorAmount,
  independentSplittingOracle,
  snapshotSplittingSources,
} from './expense-fixture.js';

export interface RepaymentFixtureInput {
  payer: string;
  payee: string;
  currencyCode: string;
  amount: string;
  paidOn: string;
}

export function parseRepaymentFixtureRows(
  rows: readonly Record<string, string>[],
): RepaymentFixtureInput[] {
  expect(rows.length, 'Independent repayment Given requires at least one row').toBeGreaterThan(0);

  return rows.map((row) => {
    expect(Object.keys(row).sort()).toEqual(['付款人', '收款人', '幣別', '金額', '日期'].sort());
    expect(row['付款人']).toBeTruthy();
    expect(row['收款人']).toBeTruthy();
    expect(row['付款人']).not.toBe(row['收款人']);
    expect(row['幣別']).toMatch(/^[A-Z]{3}$/);
    expect(row['金額']).toMatch(/^\d+(?:\.\d+)?$/);
    expect(BigInt(row['金額']!.replace('.', ''))).toBeGreaterThan(0n);
    expect(row['日期']).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const date = new Date(`${row['日期']}T00:00:00Z`);

    expect(Number.isNaN(date.getTime()), 'Fixture date must be a real calendar date').toBe(false);
    expect(date.toISOString().slice(0, 10)).toBe(row['日期']);

    return {
      payer: row['付款人']!,
      payee: row['收款人']!,
      currencyCode: row['幣別']!,
      amount: row['金額']!,
      paidOn: row['日期']!,
    };
  });
}

/** Adds real independent payment facts; does not call the command under test. */
export async function seedSplittingRepayments(
  world: LedgerWorld,
  rows: readonly Record<string, string>[],
): Promise<void> {
  const input = parseRepaymentFixtureRows(rows);

  await requireProductColumns(world, 'repayments', [
    'id',
    'owner_id',
    'trip_id',
    'payer_member_id',
    'payee_member_id',
    'amount_minor',
    'currency_code',
    'minor_unit',
    'paid_on',
    'kind',
    'settlement_id',
  ]);
  const tripId = splittingTripId(world);
  const ownerId = world.get<string>('splitting:ownerId');
  const baseline = await snapshotSplittingSources(world, tripId);
  const repaymentIds: string[] = [];
  const originals: Record<string, unknown>[] = [];

  for (const [index, row] of input.entries()) {
    const payerId = splittingMemberId(world, row.payer);
    const payeeId = splittingMemberId(world, row.payee);
    const members = await world.db.query(
      'SELECT id FROM trip_members WHERE owner_id=$1 AND trip_id=$2 AND id=ANY($3::uuid[]) AND is_active=true',
      [ownerId, tripId, [payerId, payeeId]],
    );

    expect(members.rows.map((member) => member.id).sort()).toEqual([payerId, payeeId].sort());
    const currency = await world.db.query('SELECT minor_unit FROM currencies WHERE code=$1', [
      row.currencyCode,
    ]);

    expect(currency.rowCount, `Product currency seed must contain ${row.currencyCode}`).toBe(1);
    const minorUnit = Number(currency.rows[0].minor_unit);
    const amountMinor = fixtureMinorAmount(row.amount, minorUnit).toString();
    const before = await snapshotSplittingSources(world, tripId);
    const payerBalance = independentSplittingOracle.balance(before, payerId, row.currencyCode);
    const scale = 10n ** BigInt(payerBalance.minorUnit);
    const paymentScale = 10n ** BigInt(minorUnit);

    expect(BigInt(payerBalance.numerator), 'Fixture payer must have outstanding debt').toBeLessThan(
      0n,
    );
    expect(
      BigInt(amountMinor) * BigInt(payerBalance.denominator) * scale,
      'Fixture must not bypass an overpayment confirmation',
    ).toBeLessThanOrEqual(-BigInt(payerBalance.numerator) * paymentScale);
    const id = randomUUID();
    const client = await world.db.connect();

    try {
      await client.query('BEGIN');
      const inserted = await client.query(
        "INSERT INTO repayments(id,owner_id,trip_id,payer_member_id,payee_member_id,amount_minor,currency_code,minor_unit,paid_on,kind,settlement_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'independent',NULL) RETURNING id,owner_id,trip_id,payer_member_id,payee_member_id,amount_minor::text,currency_code,minor_unit,paid_on::text,kind,settlement_id",
        [
          id,
          ownerId,
          tripId,
          payerId,
          payeeId,
          amountMinor,
          row.currencyCode,
          minorUnit,
          row.paidOn,
        ],
      );
      const expected = {
        id,
        owner_id: ownerId,
        trip_id: tripId,
        payer_member_id: payerId,
        payee_member_id: payeeId,
        amount_minor: amountMinor,
        currency_code: row.currencyCode,
        minor_unit: minorUnit,
        paid_on: row.paidOn,
        kind: 'independent',
        settlement_id: null,
      };

      expect(inserted.rows).toEqual([expected]);
      await client.query(
        'UPDATE trips SET accounting_revision=accounting_revision+1 WHERE id=$1 AND owner_id=$2',
        [tripId, ownerId],
      );
      await client.query('COMMIT');
      originals.push(expected);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    repaymentIds.push(id);
    world.splitting.ids.repayments.set(
      `${row.payer}:${row.payee}:${row.currencyCode}:${index}`,
      id,
    );
  }
  const snapshot = await snapshotSplittingSources(world, tripId);

  expect(snapshot.expenses).toEqual(baseline.expenses);
  expect(snapshot.shares).toEqual(baseline.shares);
  expect(snapshot.settlements).toEqual(baseline.settlements);
  expect(snapshot.adjustments).toEqual(baseline.adjustments);
  expect(snapshot.repayments).toHaveLength(baseline.repayments.length + originals.length);

  for (const original of originals) {
    const persisted = await world.db.query(
      'SELECT id,owner_id,trip_id,payer_member_id,payee_member_id,amount_minor::text,currency_code,minor_unit,paid_on::text,kind,settlement_id FROM repayments WHERE id=$1 AND owner_id=$2 AND trip_id=$3',
      [original.id, ownerId, tripId],
    );

    expect(persisted.rows).toEqual([original]);
  }
  world.splitting.snapshot = snapshot;
  world.set('splitting:repaymentIds', repaymentIds);
  world.set('splitting:repaymentRows', originals);
  world.set('splitting:sourceSnapshot', snapshot);
  world.set('splitting:oracle', independentSplittingOracle);
  world.set(
    'splitting:balanceOracles',
    [...new Set(input.map((row) => row.currencyCode))].flatMap((currencyCode) =>
      [...world.splitting.ids.members.values()].map((memberId) => ({
        memberId,
        currencyCode,
        amount: independentSplittingOracle.balance(snapshot, memberId, currencyCode),
      })),
    ),
  );
  world.set('splitting:revision', String(snapshot.trips[0]!.accounting_revision));
}
