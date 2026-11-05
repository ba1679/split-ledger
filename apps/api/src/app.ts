import Fastify from 'fastify';
import pg from 'pg';
import { createDatabase, migrate } from './db/index.js';
import { listCurrencies, registerCurrencyRoutes } from './modules/currencies/index.js';
import { createAuth, registerAuthRoutes } from './modules/auth/index.js';
import { registerTripRoutes } from './modules/trips/index.js';
import { registerCategoryRoutes } from './modules/categories/index.js';
import { checkOrigin, HttpError, invalid } from './http.js';

export interface AppOptions {
  pool?: pg.Pool;
  appOrigin?: string;
  authSecret?: string;
  google?: { clientId: string; clientSecret: string };
}

export function buildApp(options: AppOptions = {}) {
  const pool = options.pool ?? new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://ledger:ledger_local@127.0.0.1:54329/ledger' });
  const db = createDatabase(pool);
  const appOrigin = options.appOrigin ?? process.env.APP_ORIGIN ?? 'http://127.0.0.1:5173';
  const publicUrl = new URL(appOrigin);
  if (!['http:', 'https:'].includes(publicUrl.protocol) || publicUrl.origin !== appOrigin) throw new Error('APP_ORIGIN must be an HTTP(S) origin without a path');
  const secret = options.authSecret ?? process.env.BETTER_AUTH_SECRET ?? '';
  if (secret.length < 32) throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters');
  const clientId = options.google?.clientId ?? process.env.GOOGLE_CLIENT_ID ?? '';
  const clientSecret = options.google?.clientSecret ?? process.env.GOOGLE_CLIENT_SECRET ?? '';
  if (Boolean(clientId) !== Boolean(clientSecret)) throw new Error('Configure both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
  const authConfig = { appOrigin, secret, ...(clientId && clientSecret ? { google: { clientId, clientSecret } } : {}) };
  const auth = createAuth(db, authConfig);
  const app = Fastify({
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
    logger: {
      redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
      serializers: { req: request => ({ method: request.method, url: request.url?.split('?')[0], remoteAddress: request.ip }) },
    },
  });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) return reply.code(error.statusCode).send({ code: error.code, message: error.message, ...(error.field ? { field: error.field } : {}) });
    const failure = error as { validation?: unknown; statusCode?: number; code?: string };
    if (failure.validation || failure.statusCode === 400 || failure.statusCode === 415 || failure.code === '23514' || failure.code === '22007' || failure.code === '22008') {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: '輸入資料格式不正確。' });
    }
    app.log.error({ requestId: request.id }, 'Unexpected request failure');
    return reply.code(500).send({ code: 'INTERNAL_ERROR', message: '暫時無法完成操作，請稍後再試。' });
  });
  app.addHook('onRequest', async request => {
    const path = request.url.split('?')[0]!;
    if (!path.startsWith('/api/') || path.startsWith('/api/auth/') || !['POST', 'PATCH', 'DELETE'].includes(request.method)) return;
    // This runs before parsing/schema validation, including malformed JSON requests.
    checkOrigin(request, appOrigin);
    if (['POST', 'PATCH'].includes(request.method) && request.headers['content-type']?.split(';')[0]?.trim().toLowerCase() !== 'application/json') throw invalid('請以 JSON 格式送出資料。');
    if (request.method === 'DELETE' && (request.headers['transfer-encoding'] !== undefined || Number(request.headers['content-length'] ?? 0) !== 0)) throw invalid('刪除請求不得包含本文。');
  });
  app.addHook('onReady', async () => {
    await migrate(pool);
    await listCurrencies(db);
  });
  if (!options.pool) app.addHook('onClose', async () => { await pool.end(); });
  registerCurrencyRoutes(app, db);
  registerAuthRoutes(app, auth, authConfig);
  registerTripRoutes(app, db, auth, authConfig);
  registerCategoryRoutes(app, db, auth);
  return app;
}
