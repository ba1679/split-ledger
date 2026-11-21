import { test, expect } from '../../../../apps/api/tests/support/fixtures.js';
import { seedEmptyAnalysis, analysisContext, analysisSnapshot } from '../../../../apps/api/tests/support/category-analysis/fixture.js';
import { expectedChart } from '../../../../apps/api/tests/support/category-analysis/oracle.js';
import type { ExpenseAnalysis } from '../../../../apps/web/src/api/expense-analysis.js';
import { createHash, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const shareSizes = [1, 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31];
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
type QueryRecord = { text: string; values: unknown[]; ms: number; rows: number | null };
for (const count of [0, 500, 5000]) {
  test(`real PostgreSQL analysis cost for ${count} expenses`, async ({ world }) => {
    const acquire = () => world.db.connect();
    type Client = Awaited<ReturnType<typeof acquire>>;
    await seedEmptyAnalysis(world);
    const c = analysisContext(world), owner = world.users.get('Alice')!;
    const ids = Array.from({ length: count }, () => randomUUID());
    const extraMembers = Array.from({ length: 28 }, () => randomUUID());
    const categoryIds = Array.from({ length: 12 }, () => randomUUID());
    if (count) {
      const seed = await world.db.connect();
      try {
        await seed.query('BEGIN');
      await seed.query("INSERT INTO trip_members(id,owner_id,trip_id,role,name) SELECT id,$2,$3,'companion','Guest'||ordinality FROM unnest($1::uuid[]) WITH ORDINALITY AS m(id,ordinality)", [extraMembers, owner.id, c.tripId]);
      await seed.query("INSERT INTO categories(id,owner_id,name) SELECT id,$2,'Cost category '||ordinality FROM unnest($1::uuid[]) WITH ORDINALITY AS c(id,ordinality)", [categoryIds, owner.id]);
      await seed.query(`INSERT INTO expenses(id,owner_id,trip_id,payer_member_id,category_id,item,amount_minor,currency_code,minor_unit,spent_on)
        SELECT id,$2,$3,$4,CASE WHEN ordinality%13=0 THEN NULL ELSE ($5::uuid[])[(((ordinality-1)/12)%12+1)::int] END,
        'Cost '||ordinality,(100+ordinality%999999)::bigint,(ARRAY['TWD','JPY','USD'])[(((ordinality-1)/144)%3+1)::int],
        (ordinality%4)::smallint, DATE '2027-01-15' + (ordinality%120)::int
        FROM unnest($1::uuid[]) WITH ORDINALITY AS e(id,ordinality)`, [ids, owner.id, c.tripId, c.ownerMemberId, categoryIds]);
      const members = [c.ownerMemberId, c.members.get('Amy')!, c.members.get('Bob')!, ...extraMembers];
      await seed.query(`INSERT INTO expense_shares(owner_id,trip_id,expense_id,member_id)
        SELECT $2,$3,id,($4::uuid[])[s.i] FROM unnest($1::uuid[]) WITH ORDINALITY AS e(id,ordinality)
        CROSS JOIN LATERAL generate_series(1,($5::int[])[((ordinality-1)%12+1)::int]) AS s(i)`, [ids, owner.id, c.tripId, members, shareSizes]);
        await seed.query('COMMIT');
      } catch (error) {
        await seed.query('ROLLBACK');
        throw error;
      } finally { seed.release(); }
    }
    const environment = (await world.db.query('SELECT current_database() AS database, version() AS version')).rows[0];
    expect(environment.database).toMatch(/^ledger_test_/);
    const before = await analysisSnapshot(world), sourceHash = hash(before);
    expect(before.expenses).toHaveLength(count);
    const samples: { ms: number; bytes: number; memoryBefore: NodeJS.MemoryUsage; memoryAfter: NodeJS.MemoryUsage; queries: Omit<QueryRecord, 'values'>[] }[] = [];
    let sourceQuery: QueryRecord | undefined;
    let shareQuery: QueryRecord | undefined;
    let body: ExpenseAnalysis | undefined;
    for (let sample = 0; sample < 3; sample++) {
      const originals = new Map<Client, Client['query']>();
      const trace: QueryRecord[] = [];
      const intercept = (client: Client) => {
        if (originals.has(client)) return;
        const original = client.query;
        originals.set(client, original);
        client.query = ((...input: unknown[]) => {
          const args = [...input];
          const first = args[0];
          const config = typeof first === 'object' && first !== null ? first as { text?: string; values?: unknown[] } : undefined;
          const record: QueryRecord = { text: typeof first === 'string' ? first : String(config?.text ?? ''), values: Array.isArray(args[1]) ? args[1] : config?.values ?? [], ms: 0, rows: null };
          trace.push(record);
          const started = performance.now();
          const finish = (result?: { rowCount?: number }) => { record.ms = performance.now() - started; record.rows = result?.rowCount ?? null; };
          const callback = args[args.length - 1];
          if (typeof callback === 'function') {
            args[args.length - 1] = function (this: unknown, ...callbackArgs: unknown[]) {
              finish(callbackArgs[1] as { rowCount?: number } | undefined);
              return Reflect.apply(callback, this, callbackArgs);
            };
            return Reflect.apply(original, client, args);
          }
          const result = Reflect.apply(original, client, args) as Promise<{ rowCount?: number }>;
          return result.then((value: { rowCount?: number }) => { finish(value); return value; }, (error: unknown) => { finish(); throw error; });
        }) as Client['query'];
      };
      const memoryBefore = process.memoryUsage();
      world.db.on('acquire', intercept);
      const started = performance.now();
      let bytes = 0;
      try {
        const response = await world.api.get(`/api/trips/${c.tripId}/expense-analysis`, { headers: { Cookie: owner.cookie } });
        expect(response.status(), await response.text()).toBe(200);
        const raw = await response.body();
        bytes = raw.byteLength;
        body = JSON.parse(raw.toString()) as ExpenseAnalysis;
      } finally {
        world.db.off('acquire', intercept);
        for (const [client, original] of originals) client.query = original;
      }
      const ms = performance.now() - started, memoryAfter = process.memoryUsage();
      const begin = trace.findIndex((q) => /^begin.*repeatable read.*read only/i.test(q.text));
      const commit = trace.findIndex((q, i) => i > begin && /^commit/i.test(q.text));
      expect(begin).toBeGreaterThanOrEqual(0);
      expect(commit).toBeGreaterThan(begin);
      const transaction = trace.slice(begin + 1, commit);
      expect(transaction).toHaveLength(4);
      expect(transaction.every((q) => /^select/i.test(q.text))).toBe(true);
      expect(trace.some((q) => /^(insert|update|delete|alter|create|drop)\b/i.test(q.text))).toBe(false);
      sourceQuery = transaction.find((q) => /from\s+"expenses"/i.test(q.text));
      expect(sourceQuery, 'Capture actual production source SQL for EXPLAIN').toBeDefined();
      expect(sourceQuery!.rows).toBe(count);
      shareQuery = transaction.find((q) => /from\s+"expense_shares"/i.test(q.text));
      expect(shareQuery).toBeDefined();
      expect(shareQuery!.rows).toBe(count);
      samples.push({ ms, bytes, memoryBefore, memoryAfter, queries: trace.map(({ values: _values, ...q }) => q) });
    }
    expect(body!.tripId).toBe(c.tripId);
    expect(body!.ownerMemberId).toBe(c.ownerMemberId);
    const currencyCodes = [...new Set(before.expenses!.map((e) => String(e.currency_code)))].sort();
    expect(body!.currencies.map((r) => r.currencyCode)).toEqual(currencyCodes);
    for (const row of body!.currencies) {
      expect(row.personal).toEqual(expectedChart(before, c.ownerMemberId!, row.currencyCode, 'personal'));
      expect(row.group).toEqual(expectedChart(before, c.ownerMemberId!, row.currencyCode, 'group'));
    }
    const amounts = body!.currencies.flatMap((r) => [r.personal, r.group]).flatMap((chart) => [chart.total, ...chart.categories.map((row) => row.amount)]);
    const plan = (await world.db.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sourceQuery!.text}`, sourceQuery!.values)).rows[0]['QUERY PLAN'];
    const sharePlan = (await world.db.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${shareQuery!.text}`, shareQuery!.values)).rows[0]['QUERY PLAN'];
    const after = await analysisSnapshot(world);
    expect(hash(after)).toBe(sourceHash);
    const report = {
      environment, node: process.version, count, shareRows: before.shares!.length, categories: before.categories!.length, nullCategoryExpenses: before.expenses!.filter((e) => e.category_id === null).length,
      members: before.members!.length, currencyCodes, shareSizes: count ? shareSizes : [], historicalMinorUnits: [...new Set(before.expenses!.map((e) => e.minor_unit))].sort(),
      samples, analysisTransaction: { isolation: 'repeatable read', mode: 'read only', selects: 4, controlStatements: 2 },
      sourceQuery: { text: sourceQuery!.text, values: sourceQuery!.values }, explainAnalyzeBuffers: plan,
      shareQuery: { text: shareQuery!.text, values: shareQuery!.values }, shareExplainAnalyzeBuffers: sharePlan,
      maxDenominatorDigits: Math.max(1, ...amounts.map((a) => a.denominator.length)), maxNumeratorDigits: Math.max(1, ...amounts.map((a) => a.numerator.length)),
      sourceHashBefore: sourceHash, sourceHashAfter: hash(after), oracle: 'Existing independent DB-source BigInt oracle, not product reducer',
      memoryScope: 'Raw before/after heap/RSS of the shared in-process API + test worker; no forced GC, not isolated peak or SLO. Fixtures/previous snapshots also occupy heap. EXPLAIN follows three reads; cache is warm. No index/migration/production data changes.',
    };
    await writeFile(`specs/plans/007-category-expense-charts/checks/T129-cost-${count}.json`, JSON.stringify(report, null, 2)+'\n');
  });
}
