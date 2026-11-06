import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { fromNodeHeaders } from 'better-auth/node';
import { Type } from '@sinclair/typebox';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Database } from '../../db/index.js';
import * as schema from '../../db/auth-schema.js';
import { copyCookies, ErrorResponse, HttpError } from '../../http.js';

export interface AuthConfig {
  appOrigin: string;
  secret: string;
  google?: { clientId: string; clientSecret: string };
}

export function createAuth(db: Database, config: AuthConfig) {
  const secure = process.env.NODE_ENV === 'production' || config.appOrigin.startsWith('https:');

  return betterAuth({
    appName: '旅行記帳',
    baseURL: config.appOrigin,
    basePath: '/api/auth',
    secret: config.secret,
    trustedOrigins: [config.appOrigin],
    database: drizzleAdapter(db, { provider: 'pg', schema, schemaName: 'auth' }),
    socialProviders: config.google ? { google: config.google } : {},
    emailAndPassword: { enabled: false },
    session: { cookieCache: { enabled: false } },
    advanced: {
      // Preserve the fixed contract name even with Secure cookies in production.
      useSecureCookies: false,
      defaultCookieAttributes: { secure, httpOnly: true, sameSite: 'lax' },
      cookies: { session_token: { name: 'travelledger_session' } },
    },
    logger: { disabled: true },
  });
}

export type Auth = ReturnType<typeof createAuth>;

export async function requireUser(auth: Auth, request: FastifyRequest, reply: FastifyReply) {
  const response = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
    asResponse: true,
  });

  copyCookies(response.headers, reply);
  const data = (await response.json()) as { user?: { id: string; name: string } } | null;

  if (!response.ok || !data?.user) throw new HttpError(401, 'UNAUTHENTICATED', '請先登入。');

  return { id: data.user.id, name: data.user.name };
}

export function registerAuthRoutes(app: FastifyInstance, auth: Auth, config: AuthConfig) {
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    async handler(request, reply) {
      if (!config.google && request.url.split('?')[0] === '/api/auth/sign-in/social') {
        return reply
          .code(503)
          .send({ code: 'INTERNAL_ERROR', message: 'Google 登入尚未設定，請聯絡服務管理者。' });
      }
      // A fixed origin prevents Host/forwarding headers from controlling callbacks.
      const url = new URL(request.url, config.appOrigin);
      const response = await auth.handler(
        new Request(url, {
          method: request.method,
          headers: fromNodeHeaders(request.headers),
          ...(request.body !== undefined ? { body: JSON.stringify(request.body) } : {}),
        }),
      );

      reply.code(response.status);
      response.headers.forEach((value, name) => {
        if (name !== 'set-cookie') reply.header(name, value);
      });
      copyCookies(response.headers, reply);

      return reply.send(response.body ? await response.text() : null);
    },
  });
  app.withTypeProvider<TypeBoxTypeProvider>().get(
    '/api/me',
    {
      schema: {
        response: {
          200: Type.Object(
            { id: Type.String(), name: Type.String() },
            { additionalProperties: false },
          ),
          401: ErrorResponse,
        },
      },
    },
    (request, reply) => requireUser(auth, request, reply),
  );
}
