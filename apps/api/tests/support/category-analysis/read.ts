import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { analysisContext, analysisSnapshot } from './fixture.js';

export async function readAnalysis(world: LedgerWorld, viewer: string | null = 'Alice') {
  world.set('analysis:authBefore', await authSnapshot(world));
  world.set('analysis:before', await analysisSnapshot(world));
  const r = await callApi(
    world,
    'GET',
    `/api/trips/${analysisContext(world).tripId}/expense-analysis`,
    undefined,
    viewer,
  );
  world.set('analysis:reply', await r.json());
  world.set('analysis:after', await analysisSnapshot(world));
  world.set('analysis:authAfter', await authSnapshot(world));
}

async function authSnapshot(world: LedgerWorld) {
  const ids = [...world.users.values()].map((u) => u.id);

  return {
    users: (
      await world.db.query('SELECT id,name,email FROM auth."user" WHERE id=ANY($1) ORDER BY id', [
        ids,
      ])
    ).rows,
    sessions: (
      await world.db.query(
        'SELECT id,user_id,expires_at FROM auth.session WHERE user_id=ANY($1) ORDER BY id',
        [ids],
      )
    ).rows,
  };
}
