import type { ProxyExchange } from './response-proxy.js';
import type { Request } from '@playwright/test';
import type { ManagementUI } from '../trips/management-fixture.js';

/** Preserve every attempt; only genuine aborted GETs are excluded from the live-query view. */
export function isCancelledRead(request: Request): boolean {
  if (request.method() !== 'GET') return false;
  const message = request.failure()?.errorText ?? '';

  return (
    /net::ERR_ABORTED|\bLoad cancelled\b|\bLoad canceled\b/i.test(message) ||
    /^(?:cancelled|canceled)$/i.test(message)
  );
}

export function queryAttempts(ui: Pick<ManagementUI, 'reads'>, query: string): Request[] {
  return ui.reads.filter((request) => {
    const url = new URL(request.url());

    return `${url.pathname}${url.search}` === query;
  });
}

export function liveQueryAttempts(ui: Pick<ManagementUI, 'reads'>, query: string): Request[] {
  return queryAttempts(ui, query).filter((request) => !isCancelledRead(request));
}

export function connectedQueryExchanges(exchanges: readonly ProxyExchange[]): ProxyExchange[] {
  return exchanges.filter((exchange) => exchange.clientConnected());
}
