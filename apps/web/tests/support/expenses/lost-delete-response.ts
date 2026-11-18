import { expect, type APIResponse, type Page, type Route } from '@playwright/test';

export interface LostDeleteResponse {
  calls: number;
  done: boolean;
  status?: number;
  errors: unknown[];
  dispose(): Promise<void>;
}

/** Bodyless DELETE only: make one real request, observe its real outcome, then lose delivery. */
export async function installLostDeleteResponse(
  page: Page,
  path: string,
  completed: (response: APIResponse) => Promise<void>,
): Promise<LostDeleteResponse> {
  const pattern = `**${path}`;
  let disposed = false;
  const state: LostDeleteResponse = {
    calls: 0,
    done: false,
    errors: [],
    async dispose() {
      if (disposed) return;
      disposed = true;
      if (!page.isClosed()) await page.unroute(pattern, handler);
    },
  };
  const handler = async (route: Route) => {
    if (route.request().method() !== 'DELETE') {
      await route.fallback();

      return;
    }
    state.calls++;
    let response: APIResponse | undefined;
    try {
      expect(state.calls, 'The original DELETE must not be repeated').toBe(1);
      expect(route.request().postDataBuffer()?.length ?? 0).toBe(0);
      // No multipart/file forwarding, redirects or transport retries are involved.
      response = await route.fetch({ maxRedirects: 0, maxRetries: 0 });
      state.status = response.status();
      await completed(response);
      await route.abort('failed');
    } catch (error) {
      state.errors.push(error);
      await route.abort('failed').catch(() => {});
    } finally {
      await response?.dispose();
      state.done = true;
    }
  };
  await page.route(pattern, handler);

  return state;
}
