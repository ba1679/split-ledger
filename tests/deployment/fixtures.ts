import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { test as base, expect } from '@playwright/test';
import { createWorkerDatabase } from '../../apps/api/tests/support/database.js';

export async function freePort() {
  const server = createServer();

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();

  if (!address || typeof address === 'string') throw new Error('No test port');
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );

  return address.port;
}

export function startProcess(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const child = spawn(command, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';

  child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  child.stderr.on('data', (chunk) => {
    output += chunk;
  });
  const exited = once(child, 'exit');

  return {
    child,
    exited,
    output: () => output,
    async stop() {
      if (child.exitCode !== null || child.signalCode !== null) return;
      child.kill('SIGTERM');
      const timer = setTimeout(() => child.kill('SIGKILL'), 5000);

      try {
        await exited;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export const test = base.extend<{ database: Awaited<ReturnType<typeof createWorkerDatabase>> }>({
  // eslint-disable-next-line no-empty-pattern
  database: async ({}, use, info) => {
    const database = await createWorkerDatabase(info.workerIndex);

    try {
      await use(database);
    } finally {
      await database.dispose();
    }
  },
});

export { expect };
