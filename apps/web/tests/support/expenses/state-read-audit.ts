import type { Page } from '@playwright/test';

export interface ExpenseStateEvent {
  kind: 'state-complete' | 'expense-start';
  tripId: string;
  expenseId?: string;
  state: string;
}
type AuditWindow = Window & {
  ledgerExpenseStateAudit?: { events: ExpenseStateEvent[]; restore(): void };
};

/** Observe completed native state JSON before an ordinary expense fetch begins. */
export async function installExpenseStateAudit(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = window as AuditWindow;
    if (target.ledgerExpenseStateAudit) return;
    const original = window.fetch,
      states = new Map<string, string>(),
      events: ExpenseStateEvent[] = [];
    let enabled = true;
    const wrapped: typeof fetch = async (input, init) => {
      const path = new URL(input instanceof Request ? input.url : String(input), location.href)
        .pathname;
      const method = (
        init?.method ?? (input instanceof Request ? input.method : 'GET')
      ).toUpperCase();
      const state = path.match(/^\/api\/trips\/([0-9a-f-]{36})\/state$/i);
      const expense = path.match(/^\/api\/trips\/([0-9a-f-]{36})\/expenses\/([0-9a-f-]{36})$/i);
      if (enabled && method === 'GET') {
        if (state) states.delete(state[1]!);
        if (expense)
          events.push({
            kind: 'expense-start',
            tripId: expense[1]!,
            expenseId: expense[2]!,
            state: states.get(expense[1]!) ?? 'unconfirmed',
          });
      }
      const response = await original.call(window, input, init);
      if (method === 'GET' && state) {
        const json = response.json;
        Object.defineProperty(response, 'json', {
          configurable: true,
          writable: true,
          value: async function (this: Response) {
            const body: unknown = await json.call(this);
            if (
              enabled &&
              this === response &&
              response.status === 200 &&
              body &&
              typeof body === 'object'
            ) {
              const value = (body as Record<string, unknown>).state;
              if (typeof value === 'string' && ['active', 'trash', 'purged'].includes(value)) {
                states.set(state[1]!, value);
                events.push({ kind: 'state-complete', tripId: state[1]!, state: value });
              }
            }

            return body;
          },
        });
      }

      return response;
    };
    window.fetch = wrapped;
    target.ledgerExpenseStateAudit = {
      events,
      restore() {
        enabled = false;
        if (window.fetch === wrapped) window.fetch = original;
        delete target.ledgerExpenseStateAudit;
      },
    };
  });
}

export async function expenseStateAudit(page: Page): Promise<ExpenseStateEvent[]> {
  return page.evaluate(
    () =>
      (window as AuditWindow).ledgerExpenseStateAudit?.events.map((event) => ({ ...event })) ?? [],
  );
}

export async function restoreExpenseStateAudit(page: Page): Promise<void> {
  if (!page.isClosed())
    await page.evaluate(() => (window as AuditWindow).ledgerExpenseStateAudit?.restore());
}
