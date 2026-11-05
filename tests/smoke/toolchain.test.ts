import { expect, test } from 'vitest';
test('Node 24 runtime', () => { expect(process.versions.node.split('.')[0]).toBe('24'); });
