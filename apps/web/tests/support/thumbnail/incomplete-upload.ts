import { expect, type Page, type Route } from '@playwright/test';

export interface IncompleteUpload {
  attempts: { operationId: string; forwardedBytes: number; contentType: string }[];
  errors: unknown[];
  dispose(): Promise<void>;
}

/** End the real multipart wire body before file bytes/footer; forward the server's real rejection. */
export async function installIncompleteUpload(page: Page, path: string): Promise<IncompleteUpload> {
  const attempts: IncompleteUpload['attempts'] = [],
    errors: unknown[] = [];
  const pattern = `**${path}`;
  const handler = async (route: Route) => {
    const request = route.request();
    if (request.method() !== 'POST') {
      await route.fallback();

      return;
    }
    try {
      const headers = await request.allHeaders();
      const contentType = headers['content-type']!;
      const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/);
      expect(boundary).not.toBeNull();
      const prefix = Buffer.from(
        `--${boundary![1] ?? boundary![2]}\r\nContent-Disposition: form-data; name="image"; filename="interrupted.png"\r\nContent-Type: image/png\r\n\r\n`,
      );
      attempts.push({
        operationId: headers['x-operation-id']!,
        forwardedBytes: prefix.length,
        contentType,
      });
      expect(attempts.length, 'Incomplete upload must not trigger automatic mutation retry').toBe(
        1,
      );
      delete headers['content-length'];
      await route.fallback({ headers, postData: prefix });
    } catch (error) {
      errors.push(error);
      await route.abort('failed').catch(() => {});
    }
  };
  await page.route(pattern, handler);
  let disposed = false;

  return {
    attempts,
    errors,
    async dispose() {
      if (disposed) return;
      disposed = true;
      if (!page.isClosed()) await page.unroute(pattern, handler);
    },
  };
}
