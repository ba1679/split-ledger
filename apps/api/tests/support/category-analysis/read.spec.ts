import { test, expect } from '../fixtures.js';
import { seedAnalysisRows, analysisContext, analysisSnapshot } from './fixture.js';
import { readAnalysis } from './read.js';
import type pg from 'pg';

const rows = [
  { 項目: '午餐', 分類: '餐飲', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy' },
];
test('T022 single real GET is read-only and returns analysis', async ({ world }) => {
  await seedAnalysisRows(world, rows);
  await readAnalysis(world);
  expect(world.response!.status()).toBe(200);
  expect(world.get('analysis:after')).toEqual(world.get('analysis:before'));
  expect(world.get('analysis:reply')).toMatchObject({ tripId: analysisContext(world).tripId });
});

test('T022 concurrent committed edit cannot mix analysis source snapshots', async ({ world }) => {
  await seedAnalysisRows(world, rows);
  const c = analysisContext(world);
  const originals = new Map<pg.PoolClient, pg.PoolClient['query']>();
  let wrote = false,
    readOnly = false;
  const intercept = (client: pg.PoolClient) => {
    if (originals.has(client)) return;
    const original = client.query;
    originals.set(client, original);
    client.query = (async (...args: Parameters<pg.PoolClient['query']>) => {
      const result = await Reflect.apply(original, client, args);
      const query = args[0] as unknown;
      const text =
        typeof query === 'string'
          ? query
          : typeof query === 'object' && query !== null && 'text' in query
            ? String(query.text)
            : '';
      if (/begin.*repeatable read.*read only/i.test(text)) readOnly = true;
      if (!wrote && /^select/i.test(text) && /from\s+"?trips"?/i.test(text)) {
        wrote = true;
        await world.db.query('UPDATE expenses SET amount_minor=200 WHERE id=$1', [
          c.expenses.get('午餐'),
        ]);
      }

      return result;
    }) as pg.PoolClient['query'];
  };
  world.db.on('acquire', intercept);
  try {
    // No source snapshot helper is called while interception is active.
    const r = await world.api.get(`/api/trips/${c.tripId}/expense-analysis`, {
      headers: { Cookie: world.users.get('Alice')!.cookie },
    });
    expect(r.status()).toBe(200);
    expect(wrote).toBe(true);
    expect(readOnly).toBe(true);
    const reply = await r.json();
    expect(reply.currencies[0].personal.total).toEqual({
      numerator: '50',
      denominator: '1',
      minorUnit: 0,
    });
    expect(reply.currencies[0].group.total).toEqual({
      numerator: '100',
      denominator: '1',
      minorUnit: 0,
    });
  } finally {
    world.db.off('acquire', intercept);
    for (const [client, original] of originals) client.query = original;
  }
  if (wrote)
    expect((await analysisSnapshot(world)).expenses![0]).toMatchObject({ amount_minor: '200' });
});
for (const [viewer, status] of [
  ['未登入', 401],
  ['同名其他帳號', 404],
] as const)
  test(`T023 ${viewer} request retains authority and source`, async ({ world }) => {
    const { setAnalysisViewer } = await import('./access.js');
    await seedAnalysisRows(world, rows);
    await setAnalysisViewer(world, viewer);
    await readAnalysis(world, world.get<string | null>('analysis:viewer'));
    expect(world.get('analysis:after')).toEqual(world.get('analysis:before'));
    expect(world.response!.status()).toBe(status);
    const reply = world.get<Record<string, unknown>>('analysis:reply');
    expect(reply.code).toBe(status === 401 ? 'UNAUTHENTICATED' : 'NOT_FOUND');
  });

test('analysis expense rows and share groups retain one snapshot across a committed correction', async ({
  world,
}) => {
  await seedAnalysisRows(world, [{ ...rows[0]!, 分攤者: 'Alice、Amy、Bob' }]);
  const c = analysisContext(world);
  const originals = new Map<pg.PoolClient, pg.PoolClient['query']>();
  let wrote = false;
  let readOnly = false;
  const intercept = (client: pg.PoolClient) => {
    if (originals.has(client)) return;
    const original = client.query;
    originals.set(client, original);
    client.query = (async (...args: Parameters<pg.PoolClient['query']>) => {
      const result = await Reflect.apply(original, client, args);
      const query = args[0] as unknown;
      const text =
        typeof query === 'string'
          ? query
          : typeof query === 'object' && query !== null && 'text' in query
            ? String(query.text)
            : '';
      if (/begin.*repeatable read.*read only/i.test(text)) readOnly = true;
      if (!wrote && /^select/i.test(text) && /from\s+"?expenses"?(\s|$)/i.test(text)) {
        wrote = true;
        const writer = await world.db.connect();
        try {
          await writer.query('BEGIN');
          await writer.query('UPDATE expenses SET amount_minor=200 WHERE id=$1', [
            c.expenses.get('午餐'),
          ]);
          await writer.query('DELETE FROM expense_shares WHERE expense_id=$1', [
            c.expenses.get('午餐'),
          ]);
          await writer.query(
            'INSERT INTO expense_shares(owner_id,trip_id,expense_id,member_id) VALUES($1,$2,$3,$4)',
            [world.users.get('Alice')!.id, c.tripId, c.expenses.get('午餐'), c.members.get('Amy')],
          );
          await writer.query("UPDATE categories SET name='新餐飲' WHERE id=$1", [
            c.categories.get('餐飲'),
          ]);
          await writer.query('COMMIT');
        } catch (error) {
          await writer.query('ROLLBACK');
          throw error;
        } finally {
          writer.release();
        }
      }

      return result;
    }) as pg.PoolClient['query'];
  };
  world.db.on('acquire', intercept);
  try {
    const response = await world.api.get(`/api/trips/${c.tripId}/expense-analysis`, {
      headers: { Cookie: world.users.get('Alice')!.cookie },
    });
    expect(response.status()).toBe(200);
    expect(wrote).toBe(true);
    expect(readOnly).toBe(true);
    const reply = await response.json();
    expect(reply.hasSharedExpenses).toBe(true);
    expect(reply.currencies[0].personal.total).toEqual({
      numerator: '100',
      denominator: '3',
      minorUnit: 0,
    });
    expect(reply.currencies[0].group.total).toEqual({
      numerator: '100',
      denominator: '1',
      minorUnit: 0,
    });
    expect(reply.currencies[0].personal.categories[0].category.name).toBe('餐飲');
  } finally {
    world.db.off('acquire', intercept);
    for (const [client, original] of originals) client.query = original;
  }
  const current = await analysisSnapshot(world);
  expect(current.expenses![0]).toMatchObject({ amount_minor: '200' });
  expect(current.shares!.map((s) => s.member_id)).toEqual([c.members.get('Amy')]);
  expect(current.categories![0]).toMatchObject({ name: '新餐飲' });
});
