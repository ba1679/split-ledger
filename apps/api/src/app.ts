import Fastify from 'fastify';
export function buildApp() { return Fastify({ logger: { redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'] } }); }
