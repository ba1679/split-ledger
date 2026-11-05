import { test, expect } from './fixtures.js';
test('HTTP and scenario context are isolated', async ({ world }) => { const result = await world.api.get('/'); expect(result.status()).toBe(404); expect(world.users.size).toBe(0); expect(world.namespace).toMatch(/^[0-9a-f-]{36}$/); });
