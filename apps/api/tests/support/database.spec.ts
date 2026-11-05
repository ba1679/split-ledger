import { test, expect } from '@playwright/test';
import { createWorkerDatabase } from './database.js';
test('worker database isolates and cleans up', async () => {
 const first = await createWorkerDatabase(9000); const second = await createWorkerDatabase(9001);
 try { await first.pool.query('CREATE TABLE fixture_probe(id int)'); const result = await second.pool.query("SELECT to_regclass('fixture_probe') AS name"); expect(result.rows[0].name).toBeNull(); } finally { await first.dispose(); await second.dispose(); }
});
