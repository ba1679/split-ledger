import { When, expect } from '../../../support/fixtures.js';
import type { TripManagementSnapshot } from '../../../support/trip-management/context.js';

export interface HistoryAttempt {
  operation: string;
  rowCount: number | null;
  error?: { code?: string; message: string; where?: string };
}

When('嘗試一般 {string}', async ({ world }, operation: string) => {
  const before = world.get<TripManagementSnapshot>('management:before');
  const owner = before.members.find((row) => row.role === 'owner')!;
  const repayment = before.repayments.find((row) => row.kind === 'independent')!;
  const settlement = before.settlements[0]!;
  const adjustment = before.adjustments[0]!;
  const commands: Record<string, { sql: string; values: unknown[] }> = {
    刪除owner成員: { sql: 'DELETE FROM trip_members WHERE id=$1', values: [owner.id] },
    刪除還款: { sql: 'DELETE FROM repayments WHERE id=$1', values: [repayment.id] },
    改寫還款: {
      sql: 'UPDATE repayments SET amount_minor=amount_minor+1 WHERE id=$1',
      values: [repayment.id],
    },
    刪除結清: { sql: 'DELETE FROM settlements WHERE id=$1', values: [settlement.id] },
    改寫結清: {
      sql: 'UPDATE settlements SET source_revision=source_revision+1 WHERE id=$1',
      values: [settlement.id],
    },
    刪除調整: {
      sql: 'DELETE FROM settlement_adjustments WHERE settlement_id=$1 AND member_id=$2',
      values: [adjustment.settlement_id, adjustment.member_id],
    },
    改寫調整: {
      sql: 'UPDATE settlement_adjustments SET numerator=numerator+1 WHERE settlement_id=$1 AND member_id=$2',
      values: [adjustment.settlement_id, adjustment.member_id],
    },
  };

  expect(commands[operation]).toBeDefined();
  const client = await world.db.connect();
  const result: HistoryAttempt = { operation, rowCount: null };
  try {
    await client.query('BEGIN');
    try {
      const response = await client.query(commands[operation]!.sql, commands[operation]!.values);
      result.rowCount = response.rowCount;
    } catch (error) {
      const failure = error as { code?: string; message: string; where?: string };
      result.error = { code: failure.code, message: failure.message, where: failure.where };
    }
  } finally {
    try {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }
  world.set('management:historyAttempt', result);
});
