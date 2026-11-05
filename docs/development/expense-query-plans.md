# Expense query plan evidence

Recorded 2026-11-05 against isolated local PostgreSQL 18.3 (Debian 18.3-1.pgdg13+1). This is an observed development workload, not a production latency claim.

The database used the real application migrations and indexes. Synthetic persisted data: 20,000 expenses, 2 owners, 4 trips, 2 categories; each owner has 10,000 expenses. The selected trip has 2,000 expenses; the full fixture spans 30 dates and JPY/USD; one in seven expenses references its owner’s category. Statistics were refreshed with ANALYZE. Buffers are warm from inserting the fixture; no planner switches or forced indexes were used. The isolated database was removed afterward.

Queries below use owner/trip/category fixture identifiers as bound parameters. All API list/count queries execute together in a repeatable-read transaction; these individual EXPLAIN runs inspect the underlying SQL access paths.

## First expense page with current category names

```sql
SELECT e.id,e.trip_id,e.item,e.amount_minor,e.currency_code,e.minor_unit,e.spent_on,c.id AS category_id,c.name AS category_name FROM expenses e LEFT JOIN categories c ON c.owner_id=e.owner_id AND c.id=e.category_id WHERE e.owner_id=$1 AND e.trip_id=$2 ORDER BY e.spent_on DESC,e.id DESC LIMIT 51
```

```text
Limit  (cost=0.41..80.58 rows=51 width=90) (actual time=0.029..0.166 rows=51.00 loops=1)
  Buffers: shared hit=55
  ->  Nested Loop Left Join  (cost=0.41..1572.33 rows=1000 width=90) (actual time=0.028..0.162 rows=51.00 loops=1)
        Join Filter: (c.id = e.category_id)
        Rows Removed by Join Filter: 44
        Buffers: shared hit=55
        ->  Index Scan Backward using expenses_owner_trip_date_id_idx on expenses e  (cost=0.41..1556.30 rows=1000 width=124) (actual time=0.014..0.100 rows=51.00 loops=1)
              Index Cond: ((owner_id = 'db20d69f-4b61-41d6-ad37-a8d62f578089-甲'::text) AND (trip_id = '26e3b533-7f00-42d5-8e2e-68ba46e0943e'::uuid))
              Index Searches: 1
              Buffers: shared hit=54
        ->  Materialize  (cost=0.00..1.03 rows=1 width=64) (actual time=0.001..0.001 rows=1.00 loops=51)
              Storage: Memory  Maximum Storage: 17kB
              Buffers: shared hit=1
              ->  Seq Scan on categories c  (cost=0.00..1.02 rows=1 width=64) (actual time=0.010..0.010 rows=1.00 loops=1)
                    Filter: (owner_id = 'db20d69f-4b61-41d6-ad37-a8d62f578089-甲'::text)
                    Rows Removed by Filter: 1
                    Buffers: shared hit=1
Planning:
  Buffers: shared hit=182
Planning Time: 1.723 ms
Execution Time: 0.191 ms
```

## Full-trip expense count

```sql
SELECT count(*)::int FROM expenses WHERE owner_id=$1 AND trip_id=$2
```

```text
Aggregate  (cost=522.16..522.18 rows=1 width=4) (actual time=2.224..2.225 rows=1.00 loops=1)
  Buffers: shared hit=248
  ->  Bitmap Heap Scan on expenses  (cost=78.66..519.66 rows=1000 width=0) (actual time=1.422..2.106 rows=2000.00 loops=1)
        Recheck Cond: ((owner_id = 'db20d69f-4b61-41d6-ad37-a8d62f578089-甲'::text) AND (trip_id = '26e3b533-7f00-42d5-8e2e-68ba46e0943e'::uuid))
        Heap Blocks: exact=213
        Buffers: shared hit=248
        ->  Bitmap Index Scan on expenses_owner_trip_date_id_idx  (cost=0.00..78.41 rows=1000 width=0) (actual time=1.021..1.022 rows=2000.00 loops=1)
              Index Cond: ((owner_id = 'db20d69f-4b61-41d6-ad37-a8d62f578089-甲'::text) AND (trip_id = '26e3b533-7f00-42d5-8e2e-68ba46e0943e'::uuid))
              Index Searches: 1
              Buffers: shared hit=35
Planning:
  Buffers: shared hit=3
Planning Time: 0.951 ms
Execution Time: 2.595 ms
```

## Full-trip grouped currency totals

```sql
SELECT currency_code,minor_unit,sum(amount_minor)::text FROM expenses WHERE owner_id=$1 AND trip_id=$2 GROUP BY currency_code,minor_unit
```

```text
HashAggregate  (cost=527.16..527.23 rows=4 width=38) (actual time=1.249..1.252 rows=2.00 loops=1)
  Group Key: currency_code, minor_unit
  Batches: 1  Memory Usage: 32kB
  Buffers: shared hit=248
  ->  Bitmap Heap Scan on expenses  (cost=78.66..519.66 rows=1000 width=14) (actual time=0.333..0.638 rows=2000.00 loops=1)
        Recheck Cond: ((owner_id = 'db20d69f-4b61-41d6-ad37-a8d62f578089-甲'::text) AND (trip_id = '26e3b533-7f00-42d5-8e2e-68ba46e0943e'::uuid))
        Heap Blocks: exact=213
        Buffers: shared hit=248
        ->  Bitmap Index Scan on expenses_owner_trip_date_id_idx  (cost=0.00..78.41 rows=1000 width=0) (actual time=0.311..0.311 rows=2000.00 loops=1)
              Index Cond: ((owner_id = 'db20d69f-4b61-41d6-ad37-a8d62f578089-甲'::text) AND (trip_id = '26e3b533-7f00-42d5-8e2e-68ba46e0943e'::uuid))
              Index Searches: 1
              Buffers: shared hit=35
Planning:
  Buffers: shared hit=21
Planning Time: 0.234 ms
Execution Time: 1.707 ms
```

## Category usage across trips

```sql
SELECT count(*)::int FROM expenses WHERE owner_id=$1 AND category_id=$2
```

```text
Aggregate  (cost=464.93..464.94 rows=1 width=4) (actual time=0.603..0.603 rows=1.00 loops=1)
  Buffers: shared hit=216
  ->  Bitmap Heap Scan on expenses  (cost=11.61..463.15 rows=714 width=0) (actual time=0.053..0.530 rows=1428.00 loops=1)
        Recheck Cond: ((owner_id = 'db20d69f-4b61-41d6-ad37-a8d62f578089-甲'::text) AND (category_id = '7fef5409-8a80-4e95-ba1e-27146412bdfa'::uuid))
        Heap Blocks: exact=213
        Buffers: shared hit=216
        ->  Bitmap Index Scan on expenses_owner_category_idx  (cost=0.00..11.43 rows=714 width=0) (actual time=0.034..0.034 rows=1428.00 loops=1)
              Index Cond: ((owner_id = 'db20d69f-4b61-41d6-ad37-a8d62f578089-甲'::text) AND (category_id = '7fef5409-8a80-4e95-ba1e-27146412bdfa'::uuid))
              Index Searches: 1
              Buffers: shared hit=3
Planning Time: 0.063 ms
Execution Time: 0.620 ms
```

The observed list plan uses the date/id ordering index, while count/aggregate plans choose the owner/trip or owner/category access paths appropriate to the selected subset. No additional index or persisted summary was introduced from this small local workload.
