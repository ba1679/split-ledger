import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { analysisContext, analysisSnapshot } from './fixture.js';

export async function setAnalysisLifecycle(world: LedgerWorld, state: string) {
  const c = analysisContext(world);
  expect(['正常', '垃圾桶', '永久刪除', '已復原']).toContain(state);
  for (const action of state === '正常'
    ? []
    : state === '垃圾桶'
      ? ['trash']
      : state === '永久刪除'
        ? ['trash', 'purge']
        : ['trash', 'restore']) {
    const row = (
      await world.db.query('SELECT lifecycle_revision FROM trips WHERE id=$1', [c.tripId])
    ).rows[0];
    const r = await callApi(
      world,
      'POST',
      `/api/trips/${c.tripId}/${action}`,
      { operationId: randomUUID(), expectedLifecycleRevision: String(row.lifecycle_revision) },
      'Alice',
    );
    expect(r.status(), await r.text()).toBe(200);
  }
  const rows = (await world.db.query('SELECT deleted_at FROM trips WHERE id=$1', [c.tripId])).rows;
  if (state === '永久刪除') {
    expect(rows).toEqual([]);
    expect((await analysisSnapshot(world)).expenses).toEqual([]);
  } else {
    expect(rows).toHaveLength(1);
    expect(rows[0].deleted_at === null).toBe(state !== '垃圾桶');
  }
  world.set('analysis:lifecycle', state);
  world.set('analysis:source', await analysisSnapshot(world));
}

export async function setAnalysisViewer(world: LedgerWorld, viewer: string) {
  expect(['擁有者', '未登入', '同名其他帳號']).toContain(viewer);
  const { seedIdentity } = await import('../seed.js');
  const c = analysisContext(world);
  if (viewer === '未登入') {
    const r = await callApi(world, 'POST', '/api/auth/sign-out', {}, 'Alice');
    expect(r.status(), await r.text()).toBe(200);
    expect(
      (
        await world.db.query('SELECT id FROM auth.session WHERE user_id=$1', [
          world.users.get('Alice')!.id,
        ])
      ).rows,
    ).toEqual([]);
    world.set('analysis:viewer', null);
  } else if (viewer === '同名其他帳號') {
    const other = await seedIdentity(world, 'Amy');
    expect(other.id).not.toBe(world.users.get('Alice')!.id);
    expect(
      (
        await world.db.query('SELECT id FROM trips WHERE id=$1 AND owner_id=$2', [
          c.tripId,
          other.id,
        ])
      ).rows,
    ).toEqual([]);
    world.set('analysis:viewer', 'Amy');
  } else world.set('analysis:viewer', 'Alice');
  const selected = world.get<string | null>('analysis:viewer');
  const r = await callApi(world, 'GET', '/api/me', undefined, selected);
  expect(r.status()).toBe(selected ? 200 : 401);
  world.set('analysis:source', await analysisSnapshot(world));
}

export async function seedSameNameAnalysisAccount(world: LedgerWorld, name: string) {
  const c = analysisContext(world);
  expect(c.members.has(name)).toBe(true);
  const { seedIdentity } = await import('../seed.js');
  const other = await seedIdentity(world, name);
  expect(other.id).not.toBe(world.users.get('Alice')!.id);
  expect(other.id).not.toBe(c.members.get(name));
  expect(
    (await world.db.query('SELECT id FROM trips WHERE id=$1 AND owner_id=$2', [c.tripId, other.id]))
      .rows,
  ).toEqual([]);
  expect(world.get('analysis:viewer')).toBe('Alice');
  world.set('analysis:sameNameAccountId', other.id);
}
