import type { Page } from '@playwright/test';

export interface CreationAuditEvent {
  kind: 'create-confirmed' | 'state-confirmed' | 'trip-confirmed' | 'image-start';
  tripId: string;
  source?: 'create' | 'lookup' | 'unconfirmed';
  operationId?: string | null;
}
type AuditWindow = Window & {
  ledgerCreationAudit?: { events: CreationAuditEvent[]; restore(): void };
};

/** Observe native JSON completion and image fetch starts without changing requests or response bytes. */
export async function installCreationAudit(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = window as AuditWindow;
    if (target.ledgerCreationAudit) return;
    const original = window.fetch;
    const events: CreationAuditEvent[] = [];
    const created = new Set<string>(),
      states = new Set<string>(),
      trips = new Set<string>();
    let enabled = true;
    const wrapped: typeof fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      const method = (
        init?.method ?? (input instanceof Request ? input.method : 'GET')
      ).toUpperCase();
      const image = url.pathname.match(/^\/api\/trips\/([^/]+)\/thumbnail$/);
      if (enabled && method === 'POST' && image) {
        const tripId = image[1]!;
        const headers = new Headers(
          init?.headers ?? (input instanceof Request ? input.headers : undefined),
        );
        events.push({
          kind: 'image-start',
          tripId,
          operationId: headers.get('x-operation-id'),
          source: created.has(tripId)
            ? 'create'
            : states.has(tripId) && trips.has(tripId)
              ? 'lookup'
              : 'unconfirmed',
        });
      }
      const response = await original.call(window, input, init);
      const trip = url.pathname.match(/^\/api\/trips\/([0-9a-f-]{36})(\/state)?$/i);
      if ((method === 'POST' && url.pathname === '/api/trips') || (method === 'GET' && trip)) {
        const json = response.json;
        Object.defineProperty(response, 'json', {
          configurable: true,
          value: async function (this: Response) {
            const body: unknown = await json.call(this);
            if (enabled && this === response && body && typeof body === 'object') {
              const value = body as Record<string, unknown>;
              if (method === 'POST' && response.status === 201 && typeof value.id === 'string') {
                created.add(value.id);
                events.push({ kind: 'create-confirmed', tripId: value.id });
              } else if (trip && response.status === 200) {
                const tripId = trip[1]!;
                if (trip[2]) {
                  if (value.state === 'active') {
                    states.add(tripId);
                    events.push({ kind: 'state-confirmed', tripId });
                  } else states.delete(tripId);
                } else if (value.id === tripId) {
                  trips.add(tripId);
                  events.push({ kind: 'trip-confirmed', tripId });
                }
              }
            }

            return body;
          },
        });
      }

      return response;
    };
    window.fetch = wrapped;
    target.ledgerCreationAudit = {
      events,
      restore() {
        enabled = false;
        if (window.fetch === wrapped) window.fetch = original;
        delete target.ledgerCreationAudit;
      },
    };
  });
}

export async function creationAudit(page: Page): Promise<CreationAuditEvent[]> {
  return page.evaluate(
    () => (window as AuditWindow).ledgerCreationAudit?.events.map((event) => ({ ...event })) ?? [],
  );
}

export async function restoreCreationAudit(page: Page): Promise<void> {
  if (!page.isClosed())
    await page.evaluate(() => (window as AuditWindow).ledgerCreationAudit?.restore());
}
