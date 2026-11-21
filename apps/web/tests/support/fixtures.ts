import { test as apiTest } from '../../../api/tests/support/fixtures.js';
import type { AnalysisTestOptions } from './category-analysis/options.js';
import { createBdd } from 'playwright-bdd';
import { createServer, type ViteDevServer } from 'vite';
import { registerResponseProxy, forwardProxyResponse } from './loading/response-proxy.js';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export const test = apiTest.extend<AnalysisTestOptions, { webServer: string }>({
  analysisViewport: ['desktop', { option: true }],
  analysisVariant: ['default', { option: true }],
  hasTouch: async ({ analysisViewport }, use, testInfo) => {
    await use(
      analysisViewport === 'mobile' ||
        testInfo.tags.some((tag) => ['@F007-F02', '@F007-F32', '@F007-F58'].includes(tag)),
    );
  },
  webServer: [
    async ({ runtime }, use) => {
      const responseProxy = registerResponseProxy(runtime.webOrigin);
      let server: ViteDevServer | undefined;
      try {
        server = await createServer({
          root: fileURLToPath(new URL('../../', import.meta.url)),
          cacheDir: fileURLToPath(
            new URL(
              `../../../../.cache/vite-${process.pid}-${new URL(runtime.webOrigin).port}/`,
              import.meta.url,
            ),
          ),
          configFile: false,
          plugins: [react(), tailwindcss()],
          server: {
            host: '127.0.0.1',
            port: Number(new URL(runtime.webOrigin).port),
            strictPort: true,
            proxy: {
              '/api': {
                target: runtime.origin,
                selfHandleResponse: true,
                configure(proxy) {
                  proxy.on('proxyRes', (response, request, reply) =>
                    forwardProxyResponse(response, request, reply, responseProxy.controls),
                  );
                },
              },
            },
          },
          logLevel: 'error',
        });

        await server.listen();
        await use(runtime.webOrigin);
      } finally {
        try {
          await server?.close();
        } finally {
          responseProxy.dispose();
        }
      }
    },
    { scope: 'worker' },
  ],
  baseURL: async ({ webServer }, use) => {
    await use(webServer);
  },
});

export const { Given, When, Then } = createBdd(test);

export { expect } from '@playwright/test';

export { LedgerWorld } from '../../../api/tests/support/world.js';
