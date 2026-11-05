import { boolean, char, date, pgTable, smallint, text } from 'drizzle-orm/pg-core';

export const currencies = pgTable('currencies', {
  code: char('code', { length: 3 }).primaryKey(),
  name: text('name').notNull(),
  minorUnit: smallint('minor_unit').notNull(),
  snapshotDate: date('snapshot_date', { mode: 'string' }).notNull(),
  isSelectable: boolean('is_selectable').notNull(),
});
