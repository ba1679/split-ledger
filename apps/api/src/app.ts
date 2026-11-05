import Fastify from 'fastify';
import pg from 'pg';
import { createDatabase, migrate } from './db/index.js';
import { listCurrencies, registerCurrencyRoutes } from './modules/currencies/index.js';

export interface AppOptions {
  pool?: pg.Pool;
  appOrigin?: string;
  authSecret?: string;
  testMode?: boolean;
  google?: { clientId: string; clientSecret: string };
}

export function buildApp(options: AppOptions = {}) {
  const pool = options.pool ?? new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://ledger:ledger_local@127.0.0.1:54329/ledger' });
  const db = createDatabase(pool);
  const app = Fastify({ logger: { redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'] } });
  app.addHook('onReady', async () => {
    await migrate(pool);
    await listCurrencies(db);
  });
  if (!options.pool) app.addHook('onClose', async () => { await pool.end(); });
  registerCurrencyRoutes(app, db);
  return app;
}
