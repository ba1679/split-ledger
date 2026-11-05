import { Type } from '@sinclair/typebox';
import type { FastifyReply, FastifyRequest } from 'fastify';

export const ErrorResponse = Type.Object({ code: Type.String(), message: Type.String(), field: Type.Optional(Type.String()) }, { additionalProperties: false });
export const Uuid = Type.String({ format: 'uuid' });
export const DateOnly = Type.Union([Type.String({ format: 'date' }), Type.Null()]);
export const Timestamp = Type.String({ format: 'date-time' });
export class HttpError extends Error {
  constructor(readonly statusCode: number, readonly code: string, message: string, readonly field?: string) { super(message); }
}
export const notFound = () => new HttpError(404, 'NOT_FOUND', '找不到這筆資料。');
export const invalid = (message = '輸入資料格式不正確。', field?: string) => new HttpError(400, 'VALIDATION_ERROR', message, field);
export function checkOrigin(request: FastifyRequest, appOrigin: string) {
  if (request.headers.origin !== appOrigin) throw new HttpError(403, 'REQUEST_ORIGIN_REJECTED', '請重新整理頁面後再試。');
}
export function copyCookies(headers: Headers, reply: FastifyReply) {
  const cookies = headers.getSetCookie();
  if (cookies.length) reply.header('set-cookie', cookies);
}
