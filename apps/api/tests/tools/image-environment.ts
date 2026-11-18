import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium, webkit } from '@playwright/test';
import { createWorkerDatabase } from '../support/database.js';

const require = createRequire(import.meta.url);

// Resolve native packages without attempting to load a foreign-platform binary.
const targets = new Set([
  `${process.platform}-${process.arch}`,
  `linux-${process.arch}`,
  'linux-x64',
]);

for (const target of targets) {
  console.log(
    target,
    require.resolve(`@img/sharp-${target}/sharp.node`, {
      paths: [require.resolve('sharp')],
    }),
  );
}
for (const browser of [chromium, webkit]) {
  assert.ok(existsSync(browser.executablePath()), `${browser.name()} needs playwright install`);
  console.log(`${browser.name()} executable installed`);
}

const database = await createWorkerDatabase(0);

try {
  const result = await database.pool.query('SELECT count(*)::int AS count FROM _ledger_migrations');

  assert.ok(result.rows[0].count > 0);
  console.log(`Isolated database: production runner applied ${result.rows[0].count} migrations`);
} finally {
  await database.dispose();
  console.log('Isolated database and pools disposed');
}
