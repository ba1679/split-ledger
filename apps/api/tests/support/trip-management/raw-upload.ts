import { request } from 'node:http';
import type { IncomingHttpHeaders } from 'node:http';

export type RawUploadResult =
  | { kind: 'http'; status: number; headers: IncomingHttpHeaders; body: Buffer }
  | { kind: 'closed'; error: Error };

/** A genuine socket request, including optional unfinished chunked transmission. */
export function startRawUpload(
  url: URL,
  headers: Record<string, string>,
  body: Buffer,
  finish = true,
) {
  let resolve!: (result: RawUploadResult) => void;
  let settled = false;
  const result = new Promise<RawUploadResult>((done) => {
    resolve = done;
  });
  const settle = (value: RawUploadResult) => {
    if (settled) return;
    settled = true;
    resolve(value);
  };
  const req = request(url, { method: 'POST', headers, agent: false }, (response) => {
    const chunks: Buffer[] = [];
    response.on('data', (chunk: Buffer) => chunks.push(chunk));
    response.on('end', () =>
      settle({
        kind: 'http',
        status: response.statusCode!,
        headers: response.headers,
        body: Buffer.concat(chunks),
      }),
    );
    response.on('error', (error: Error) => settle({ kind: 'closed', error }));
  });
  req.on('error', (error: Error) => settle({ kind: 'closed', error }));
  req.setTimeout(95000, () =>
    req.destroy(new Error('Fixture socket exceeded 95s safety deadline')),
  );
  if (finish) req.end(body);
  else {
    req.flushHeaders();
    req.write(body);
  }

  return {
    result,
    end() {
      req.end();
    },
    abort() {
      req.destroy(new Error('Fixture client aborted upload'));
    },
    async dispose() {
      if (!settled) req.destroy(new Error('Fixture disposed unfinished upload'));
      await result;
      req.destroy();
    },
  };
}
