import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  char,
  date,
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
