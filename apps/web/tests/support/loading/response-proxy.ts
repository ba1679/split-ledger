import type { IncomingMessage, ServerResponse, IncomingHttpHeaders } from 'node:http';

export interface ProxyExchange {
  method: string;
  path: string;
  status: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
  /** Observe native client cancellation without changing any request/response bytes. */
  clientConnected(): boolean;
}

export interface ResponseProxyControl {
  matches(request: IncomingMessage): boolean;
  handle(exchange: ProxyExchange): Promise<'drop' | 'forward'>;
  failed(error: unknown): void;
}
const registries = new Map<string, Set<ResponseProxyControl>>();

export function registerResponseProxy(origin: string) {
  if (registries.has(origin)) throw new Error('Duplicate test response proxy origin');
  const controls = new Set<ResponseProxyControl>();
  registries.set(origin, controls);

  return {
    controls,
    dispose() {
      registries.delete(origin);
      const remaining = controls.size;
      controls.clear();
      if (remaining) throw new Error(`Unreleased test response controls: ${remaining}`);
    },
  };
}

export function responseProxyControls(origin: string): Set<ResponseProxyControl> {
  const controls = registries.get(origin);
  if (!controls) throw new Error('Test response proxy is not registered');

  return controls;
}

/** Native request streams are untouched; only selected, completed real responses may be held/dropped. */
export function forwardProxyResponse(
  upstream: IncomingMessage,
  request: IncomingMessage,
  reply: ServerResponse,
  controls: ReadonlySet<ResponseProxyControl>,
): void {
  let control: ResponseProxyControl | undefined;
  for (const candidate of controls) {
    try {
      if (candidate.matches(request)) {
        control = candidate;
        break;
      }
    } catch (error) {
      candidate.failed(error);
      upstream.resume();
      reply.destroy();

      return;
    }
  }
  if (!control) {
    if (reply.destroyed) {
      upstream.destroy();

      return;
    }
    reply.writeHead(upstream.statusCode ?? 502, upstream.headers);
    upstream.once('error', () => reply.destroy());
    upstream.pipe(reply);

    return;
  }
  const selected = control;
  const chunks: Buffer[] = [];
  let bytes = 0,
    ended = false;
  const failed = (error: unknown) => {
    if (ended) return;
    ended = true;
    selected.failed(error);
    upstream.destroy();
    reply.destroy();
  };
  upstream.on('data', (chunk: Buffer) => {
    bytes += chunk.length;
    if (bytes > 1048576) {
      failed(new Error('Controlled command response exceeded 1 MiB'));

      return;
    }
    chunks.push(chunk);
  });
  upstream.once('error', failed);
  upstream.once('aborted', () =>
    failed(new Error('Upstream response aborted before confirmation')),
  );
  upstream.once('end', () => {
    if (ended) return;
    ended = true;
    void (async () => {
      try {
        const body = Buffer.concat(chunks);
        const action = await selected.handle({
          method: request.method!,
          path: new URL(request.url!, 'http://test.invalid').pathname,
          status: upstream.statusCode!,
          headers: upstream.headers,
          body,
          clientConnected: () => !reply.destroyed && !request.aborted,
        });
        if (action === 'drop') {
          if (reply.destroyed) return;
          if (body.length < 2) throw new Error('A dropped command response needs a real payload');
          // Deliver genuine headers and one genuine body byte before truncation.
          // Otherwise Chromium transparently retries a POST when it receives no response bytes.
          reply.writeHead(upstream.statusCode!, upstream.headers);
          reply.flushHeaders();
          reply.write(body.subarray(0, 1), () => reply.destroy());

          return;
        }
        if (!reply.destroyed) {
          reply.writeHead(upstream.statusCode!, upstream.headers);
          reply.end(body);
        }
      } catch (error) {
        selected.failed(error);
        reply.destroy();
      }
    })();
  });
}
