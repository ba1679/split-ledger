import type { Page, Route } from '@playwright/test';
import { createTripBody } from './new-trip-flow.js';

export interface RejectedCreate {
  original: Readonly<Record<string, unknown>>;
  wire: Readonly<Record<string, unknown>>;
}

export interface CreateRejection {
  attempts(): readonly RejectedCreate[];
  errors(): readonly unknown[];
  dispose(): Promise<void>;
}

/** Exercise the actual API validator with a scoped invalid wire name; never manufacture a response. */
export async function installCreateRejection(page: Page): Promise<CreateRejection> {
  const attempts: RejectedCreate[] = [];
  const errors: unknown[] = [];
  const pattern = /\/api\/trips(?:\?.*)?$/;
  const handler = async (route: Route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();

      return;
    }
    try {
      const request = route.request();
      const original = createTripBody(request);
      const wire = Object.freeze({ ...original, name: '' });
      attempts.push({ original, wire });
      const headers = await request.allHeaders();
      delete headers['content-length'];
      await route.fallback({ headers, postData: JSON.stringify(wire) });
    } catch (error) {
      errors.push(error);
      await route.abort('failed').catch(() => {});
    }
  };
  await page.route(pattern, handler);
  let disposed = false;

  return {
    attempts: () => attempts,
    errors: () => errors,
    async dispose() {
      if (disposed) return;
      disposed = true;
      if (!page.isClosed()) await page.unroute(pattern, handler);
    },
  };
}
