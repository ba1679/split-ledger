import { test, expect, freePort, startProcess } from './fixtures.js';

test('isolated database and child-process cleanup', async ({ database }) => {
  const port = await freePort();
  const result = await database.pool.query('SELECT current_database() AS name');

  expect(result.rows[0].name).toMatch(/^ledger_test_/);
  expect(port).toBeGreaterThan(0);
  const process = startProcess(
    globalThis.process.execPath,
    ['-e', 'setInterval(() => {}, 1000)'],
    globalThis.process.env,
  );

  await process.stop();
  expect(process.child.signalCode).not.toBeNull();
});
