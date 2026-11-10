import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  char,
  date,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema.js';

export { user, session, account, verification } from './auth-schema.js';

export const currencies = pgTable('currencies', {
  code: char('code', { length: 3 }).primaryKey(),
  name: text('name').notNull(),
  minorUnit: smallint('minor_unit').notNull(),
  snapshotDate: date('snapshot_date', { mode: 'string' }).notNull(),
  isSelectable: boolean('is_selectable').notNull(),
});

export const trips = pgTable('trips', {
  id: uuid('id').primaryKey(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => user.id),
  name: text('name').notNull(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  simplifyDebts: boolean('simplify_debts').notNull().default(false),
  accountingRevision: bigint('accounting_revision', { mode: 'bigint' }).notNull().default(0n),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tripMembers = pgTable('trip_members', {
  id: uuid('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  tripId: uuid('trip_id').notNull(),
  role: text('role', { enum: ['owner', 'companion'] }).notNull(),
  name: text('name').notNull(),
  nameKey: text('name_key')
    .notNull()
    .generatedAlwaysAs(
      sql`translate(name,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')`,
    ),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => user.id),
  name: text('name').notNull(),
  nameKey: text('name_key')
    .notNull()
    .generatedAlwaysAs(
      sql`translate(name,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')`,
    ),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const expenses = pgTable('expenses', {
  payerMemberId: uuid('payer_member_id').notNull(),
  id: uuid('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  tripId: uuid('trip_id').notNull(),
  categoryId: uuid('category_id'),
  item: text('item').notNull(),
  amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
  currencyCode: char('currency_code', { length: 3 }).notNull(),
  minorUnit: smallint('minor_unit').notNull(),
  spentOn: date('spent_on').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const expenseShares = pgTable('expense_shares', {
  ownerId: text('owner_id').notNull(),
  tripId: uuid('trip_id').notNull(),
  expenseId: uuid('expense_id').notNull(),
  memberId: uuid('member_id').notNull(),
});

export const settlements = pgTable('settlements', {
  id: uuid('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  tripId: uuid('trip_id').notNull(),
  debtorMemberId: uuid('debtor_member_id').notNull(),
  creditorMemberId: uuid('creditor_member_id').notNull(),
  currencyCode: char('currency_code', { length: 3 }).notNull(),
  obligationNumerator: numeric('obligation_numerator').notNull(),
  obligationDenominator: numeric('obligation_denominator').notNull(),
  obligationMinorUnit: smallint('obligation_minor_unit').notNull(),
  arrangementKey: text('arrangement_key').notNull(),
  sourceRevision: bigint('source_revision', { mode: 'bigint' }).notNull(),
  simplifyDebts: boolean('simplify_debts').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const repayments = pgTable('repayments', {
  id: uuid('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  tripId: uuid('trip_id').notNull(),
  payerMemberId: uuid('payer_member_id').notNull(),
  payeeMemberId: uuid('payee_member_id').notNull(),
  amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
  currencyCode: char('currency_code', { length: 3 }).notNull(),
  minorUnit: smallint('minor_unit').notNull(),
  paidOn: date('paid_on').notNull(),
  kind: text('kind', { enum: ['independent', 'settlement'] }).notNull(),
  settlementId: uuid('settlement_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const settlementAdjustments = pgTable('settlement_adjustments', {
  settlementId: uuid('settlement_id').notNull(),
  ownerId: text('owner_id').notNull(),
  tripId: uuid('trip_id').notNull(),
  memberId: uuid('member_id').notNull(),
  currencyCode: char('currency_code', { length: 3 }).notNull(),
  numerator: numeric('numerator').notNull(),
  denominator: numeric('denominator').notNull(),
  minorUnit: smallint('minor_unit').notNull(),
});
