import { randomUUID, createHmac } from 'node:crypto';
import { expect } from '@playwright/test';
import type pg from 'pg';
import type { LedgerWorld, Identity } from './world.js';

export const TEST_AUTH_SECRET = 'ledger-test-only-secret-at-least-32-characters';

export const SESSION_COOKIE = 'travelledger_session';

export async function requireProductTable(world: LedgerWorld, table: string) {
  const result = await world.db.query('SELECT to_regclass($1) AS table_name', [table]);

  expect(result.rows[0].table_name, `Product migration must provide ${table}`).not.toBeNull();
}

async function hasProductColumn(world: LedgerWorld, table: string, column: string) {
  const result = await world.db.query(
    'SELECT 1 FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 AND column_name=$3',
    ['public', table, column],
  );

  return result.rowCount === 1;
}

async function seedTransaction<T>(
  world: LedgerWorld,
  write: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await world.db.connect();

  try {
    await client.query('BEGIN');
    const result = await write(client);

    await client.query('COMMIT');

    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function signedCookie(token: string) {
  const signature = createHmac('sha256', TEST_AUTH_SECRET).update(token).digest('base64');

  return `${SESSION_COOKIE}=${encodeURIComponent(`${token}.${signature}`)}`;
}

async function insertSession(world: LedgerWorld, identity: Omit<Identity, 'cookie'>) {
  await requireProductTable(world, 'auth.session');
  const token = randomUUID();

  await world.db.query(
    "INSERT INTO auth.session(id,user_id,token,expires_at,created_at,updated_at) VALUES($1,$2,$3,now()+interval '7 days',now(),now())",
    [randomUUID(), identity.id, token],
  );

  return { ...identity, cookie: signedCookie(token) };
}

export async function seedIdentity(world: LedgerWorld, label = '甲'): Promise<Identity> {
  const existing = world.users.get(label);

  if (existing) return existing;

  await requireProductTable(world, 'auth.user');
  const user = {
    id: `${world.namespace}-${label}`,
    name: label,
    email: `${world.namespace}-${encodeURIComponent(label)}@example.test`.toLowerCase(),
  };

  await world.db.query(
    'INSERT INTO auth."user"(id,name,email,email_verified,created_at,updated_at) VALUES($1,$2,$3,true,now(),now())',
    [user.id, user.name, user.email],
  );
  await requireProductTable(world, 'auth.account');
  await world.db.query(
    'INSERT INTO auth.account(id,user_id,account_id,provider_id,created_at,updated_at) VALUES($1,$2,$3,$4,now(),now())',
    [randomUUID(), user.id, user.id, 'google'],
  );
  const identity = await insertSession(world, user);

  world.users.set(label, identity);

  return identity;
}

export async function seedSession(world: LedgerWorld, label = '甲') {
  const user = await seedIdentity(world, label);

  return insertSession(world, user);
}

export interface SeedTrip {
  id: string;
  owner_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
}

export async function seedTrip(
  world: LedgerWorld,
  name: string,
  owner = '甲',
  dates: { startDate?: string | null; endDate?: string | null } = {},
): Promise<SeedTrip> {
  const key = `seed:trip:${owner}:${name}`;

  if (world.state.has(key)) return world.get<SeedTrip>(key);

  const user = await seedIdentity(world, owner);

  await requireProductTable(world, 'trips');
  const splitting = await hasProductColumn(world, 'trips', 'accounting_revision');

  if (splitting) await requireProductTable(world, 'trip_members');
  const trip = await seedTransaction(world, async (client) => {
    const result = await client.query(
      'INSERT INTO trips(id,owner_id,name,start_date,end_date) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [randomUUID(), user.id, name, dates.startDate ?? null, dates.endDate ?? null],
    );
    const row = result.rows[0] as SeedTrip;

    if (splitting) {
      await client.query(
        "INSERT INTO trip_members(id,owner_id,trip_id,role,name,is_active,created_at,updated_at) VALUES($1,$2,$3,'owner',$4,true,now(),now())",
        [randomUUID(), user.id, row.id, user.name],
      );
    }

    return row;
  });

  world.set(key, trip);

  return trip;
}

export interface SeedCategory {
  id: string;
  owner_id: string;
  name: string;
}

export async function seedCategory(
  world: LedgerWorld,
  name: string,
  owner = '甲',
): Promise<SeedCategory> {
  const key = `seed:category:${owner}:${name}`;

  if (world.state.has(key)) return world.get<SeedCategory>(key);

  const user = await seedIdentity(world, owner);

  await requireProductTable(world, 'categories');
  const result = await world.db.query(
    'INSERT INTO categories(id,owner_id,name) VALUES($1,$2,$3) RETURNING *',
    [randomUUID(), user.id, name],
  );
  const category = result.rows[0] as SeedCategory;

  world.set(key, category);

  return category;
}

export interface ExpenseSeed {
  item: string;
  tripName?: string;
  owner?: string;
  amount: string | number;
  currencyCode?: string;
  spentOn?: string;
  categoryName?: string | null;
  minorUnit?: number;
}

export interface SeedExpense {
  id: string;
  owner_id: string;
  trip_id: string;
  category_id: string | null;
  item: string;
  amount_minor: string;
  currency_code: string;
  minor_unit: number;
  spent_on: string;
}

export async function seedExpense(world: LedgerWorld, input: ExpenseSeed): Promise<SeedExpense> {
  const owner = input.owner ?? '甲',
    user = await seedIdentity(world, owner),
    trip = await seedTrip(world, input.tripName ?? '日本旅行', owner);

  await requireProductTable(world, 'expenses');
  const code = input.currencyCode ?? 'JPY';
  const currency = await world.db.query('SELECT minor_unit FROM currencies WHERE code=$1', [code]);

  expect(currency.rowCount, `Product currency seed must contain ${code}`).toBe(1);
  const minor = input.minorUnit ?? Number(currency.rows[0].minor_unit);
  const [whole = '0', fraction = ''] = String(input.amount).split('.');

  if (fraction.length > minor) throw Error('Invalid fixture precision');

  const amount = (
    BigInt(whole) * 10n ** BigInt(minor) +
    BigInt(fraction.padEnd(minor, '0') || '0')
  ).toString();
  const category = input.categoryName ? await seedCategory(world, input.categoryName, owner) : null;
  const splitting = await hasProductColumn(world, 'expenses', 'payer_member_id');

  if (splitting) {
    await requireProductTable(world, 'trip_members');
    await requireProductTable(world, 'expense_shares');
  }
  const expense = await seedTransaction(world, async (client) => {
    const values = [
      randomUUID(),
      user.id,
      trip.id,
      category?.id ?? null,
      input.item,
      amount,
      code,
      minor,
      input.spentOn ?? '2027-03-11',
    ];
    let payerMemberId: string | undefined;

    if (splitting) {
      const members = await client.query<{ id: string }>(
        "SELECT id FROM trip_members WHERE owner_id=$1 AND trip_id=$2 AND role='owner' AND is_active=true",
        [user.id, trip.id],
      );

      expect(
        members.rows,
        'Product trip must have exactly one active fixed owner member',
      ).toHaveLength(1);
      payerMemberId = members.rows[0]!.id;
    }
    const result = await client.query(
      splitting
        ? 'INSERT INTO expenses(id,owner_id,trip_id,category_id,item,amount_minor,currency_code,minor_unit,spent_on,payer_member_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *'
        : 'INSERT INTO expenses(id,owner_id,trip_id,category_id,item,amount_minor,currency_code,minor_unit,spent_on) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      splitting ? [...values, payerMemberId] : values,
    );
    const row = result.rows[0] as SeedExpense;

    if (splitting) {
      await client.query(
        'INSERT INTO expense_shares(owner_id,trip_id,expense_id,member_id) VALUES($1,$2,$3,$4)',
        [user.id, trip.id, row.id, payerMemberId],
      );
    }

    return row;
  });

  world.set(`seed:expense:${owner}:${input.item}`, expense);

  return expense;
}

export async function callApi(
  world: LedgerWorld,
  method: string,
  path: string,
  data?: unknown,
  owner: string | null = '甲',
) {
  const headers: Record<string, string> = {
    origin: world.state.has('webOrigin') ? world.get<string>('webOrigin') : world.origin,
  };

  if (owner !== null) {
    const user = world.users.get(owner);

    if (user) headers.cookie = user.cookie;
  }

  world.response = await world.api.fetch(path, {
    method,
    headers,
    ...(data !== undefined ? { data } : {}),
  });

  return world.response;
}
