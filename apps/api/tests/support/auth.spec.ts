import { randomUUID } from 'node:crypto';
import { getAuthTables } from 'better-auth/db';
import { getTableColumns } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { test, expect } from './fixtures.js';
import { registerGoogleCode } from './google.js';
import { seedIdentity, seedTrip, TEST_AUTH_SECRET } from './seed.js';
import * as authSchema from '../../src/db/auth-schema.js';

test('Google callback creates a real session and forwards individual cookies; signout revokes it', async ({ world }) => {
  const user = await seedIdentity(world);
  const origin = world.get<string>('webOrigin');
  const before = (await world.db.query('SELECT count(*)::int AS count FROM auth.session WHERE user_id=$1', [user.id])).rows[0].count;
  const initiation = await world.api.post('/api/auth/sign-in/social', { headers: { origin }, data: { provider: 'google', callbackURL: `${origin}/trips`, errorCallbackURL: `${origin}/?error=google` } });
  expect(initiation.status()).toBe(200);
  const authorization = new URL((await initiation.json()).url);
  const callback = new URL(authorization.searchParams.get('redirect_uri')!);
  expect(callback.origin).toBe(origin);
  expect(authorization.searchParams.get('code_challenge_method')).toBe('S256');
  callback.searchParams.set('state', authorization.searchParams.get('state')!);
  callback.searchParams.set('code', registerGoogleCode(user, authorization));
  const result = await world.api.get(`${callback.pathname}${callback.search}`, { maxRedirects: 0 });
  expect(result.status()).toBe(302);
  expect(result.headers().location).toBe(`${origin}/trips`);
  const cookies = (await result.headersArray()).filter(header => header.name.toLowerCase() === 'set-cookie');
  expect(cookies.length).toBeGreaterThan(1);
  expect(cookies.some(cookie => /^travelledger_session=/.test(cookie.value) && /HttpOnly/i.test(cookie.value) && /SameSite=Lax/i.test(cookie.value))).toBe(true);
  const me = await world.api.get('/api/me');
  expect(me.status()).toBe(200); expect(await me.json()).toEqual({ id: user.id, name: user.name });
  expect((await world.db.query('SELECT count(*)::int AS count FROM auth.session WHERE user_id=$1', [user.id])).rows[0].count).toBe(before + 1);
  const logout = await world.api.post('/api/auth/sign-out', { headers: { origin }, data: {} });
  expect(logout.status()).toBe(200);
  expect((await world.api.get('/api/me')).status()).toBe(401);
  expect((await world.db.query('SELECT count(*)::int AS count FROM auth.session WHERE user_id=$1', [user.id])).rows[0].count).toBe(before);
});

test('business Origin rejection precedes malformed JSON; failures preserve data and hide ownership', async ({ world }) => {
  const owner = await seedIdentity(world); const other = await seedIdentity(world, '乙');
  const trip = await seedTrip(world, '日本旅行', '甲', { startDate: '2027-03-10' });
  const before = (await world.db.query('SELECT * FROM trips WHERE id=$1', [trip.id])).rows;
  const origin = world.get<string>('webOrigin');
  const rejected = await world.api.patch(`/api/trips/${trip.id}`, { headers: { cookie: owner.cookie, origin: 'https://untrusted.example', 'content-type': 'application/json' }, data: '{broken' });
  expect(rejected.status()).toBe(403); expect(await rejected.json()).toMatchObject({ code: 'REQUEST_ORIGIN_REJECTED' });
  const badType = await world.api.patch(`/api/trips/${trip.id}`, { headers: { cookie: owner.cookie, origin, 'content-type': 'text/plain' }, data: '{}' });
  expect(badType.status()).toBe(400);
  for (const data of [{ ownerId: other.id, startDate: '2027-03-11' }, { name: 123 }]) {
    const response = await world.api.patch(`/api/trips/${trip.id}`, { headers: { cookie: owner.cookie, origin }, data });
    expect(response.status()).toBe(400);
  }
  for (const limit of ['', '0', '50abc', '1.5', '101']) expect((await world.api.get(`/api/trips?limit=${limit}`, { headers: { cookie: owner.cookie } })).status()).toBe(400);
  const foreign = await world.api.get(`/api/trips/${trip.id}`, { headers: { cookie: other.cookie } });
  const missing = await world.api.get(`/api/trips/${randomUUID()}`, { headers: { cookie: other.cookie } });
  expect(foreign.status()).toBe(404); expect(missing.status()).toBe(404);
  expect(await foreign.json()).toEqual(await missing.json());
  const error = JSON.stringify(await foreign.json());
  for (const privateValue of [owner.id, trip.id, '日本旅行', TEST_AUTH_SECRET, owner.cookie]) expect(error).not.toContain(privateValue);
  expect((await world.db.query('SELECT * FROM trips WHERE id=$1', [trip.id])).rows).toEqual(before);
});

test('expired and forged session tokens cannot read an account', async ({ world }) => {
  const user = await seedIdentity(world);
  expect((await world.api.get('/api/me', { headers: { cookie: `${user.cookie}invalid-signature` } })).status()).toBe(401);
  await world.db.query('UPDATE auth.session SET expires_at=now()-interval \'1 day\' WHERE user_id=$1', [user.id]);
  const expired = await world.api.get('/api/me', { headers: { cookie: user.cookie } });
  expect(expired.status()).toBe(401); expect(await expired.json()).toMatchObject({ code: 'UNAUTHENTICATED' });
});

test('auth SQL/Drizzle fields match the pinned Better Auth generated core schema', async ({ world }) => {
  const tables: Record<string, PgTable> = { user: authSchema.user, session: authSchema.session, account: authSchema.account, verification: authSchema.verification };
  for (const [name, model] of Object.entries(getAuthTables({}))) {
    const columns = getTableColumns(tables[name]!);
    expect(Object.keys(columns).sort()).toEqual(['id', ...Object.keys(model.fields)].sort());
    const stored = (await world.db.query('SELECT column_name,is_nullable,udt_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2', ['auth', name])).rows;
    expect(stored).toHaveLength(Object.keys(columns).length);
    for (const [field, attribute] of Object.entries(model.fields)) {
      const column = columns[field]!;
      expect(column.dataType).toBe(attribute.type);
      expect(column.notNull).toBe(attribute.required === true);
      expect(stored.find(row => row.column_name === column.name)).toMatchObject({ is_nullable: attribute.required ? 'NO' : 'YES', udt_name: attribute.type === 'date' ? 'timestamptz' : attribute.type === 'boolean' ? 'bool' : 'text' });
    }
  }
});
