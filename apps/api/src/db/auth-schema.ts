import { boolean, index, pgSchema, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

// Checked against getAuthTables() from the pinned Better Auth 1.7.16 package.
export const authSchema = pgSchema('auth');
const time = (name: string) => timestamp(name, { withTimezone: true });

export const user = authSchema.table('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  createdAt: time('created_at').notNull(),
  updatedAt: time('updated_at').notNull(),
});

export const session = authSchema.table(
  'session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: time('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: time('created_at').notNull(),
    updatedAt: time('updated_at').notNull(),
  },
  (table) => [index('session_user_id_idx').on(table.userId)],
);

export const account = authSchema.table(
  'account',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: time('access_token_expires_at'),
    refreshTokenExpiresAt: time('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: time('created_at').notNull(),
    updatedAt: time('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('account_provider_account_uq').on(table.providerId, table.accountId),
    index('account_user_id_idx').on(table.userId),
  ],
);

export const verification = authSchema.table(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: time('expires_at').notNull(),
    createdAt: time('created_at').notNull(),
    updatedAt: time('updated_at').notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
);
