import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect } from '@playwright/test';
import type { LedgerWorld } from './world.js';
import { callApi, seedIdentity, seedTrip, seedCategory, seedExpense, seedSession, requireProductTable } from './seed.js';

type Row = Record<string, unknown> & { id: string };
type TripRow = Row & { owner_id: string; name: string; start_date: string | null; end_date: string | null };
type ExpenseRow = Row & { owner_id: string; trip_id: string; category_id: string | null; item: string; amount_minor: string; currency_code: string; minor_unit: number; spent_on: string };
type CategoryRow = Row & { owner_id: string; name: string };
type ExpenseView = { id: string; tripId: string; item: string; amount: string; currencyCode: string; minorUnit: number; spentOn: string; category: { id: string; name: string } | null };
type Total = { currencyCode: string; amount: string; minorUnit: number };
const key = (name: string) => `backend:${name}`;
export const id = (w: LedgerWorld, kind: string): string => w.get(key(`${kind}Id`));
export async function login(w: LedgerWorld, owner = '甲') { return seedIdentity(w, owner); }
export async function trip(w: LedgerWorld, name = '日本旅行', dates: { startDate?: string | null; endDate?: string | null } = {}, owner = '甲') {
 const row = await seedTrip(w, name, owner, dates);
 w.set(key('tripId'), row.id);
 expect((await tripRow(w)).owner_id).toBe(w.users.get(owner)!.id);
 return row;
}
export async function category(w: LedgerWorld, name = '餐飲', owner = '甲') {
 const row = await seedCategory(w, name, owner);
 w.set(key('categoryId'), row.id);
 expect((await categoryRow(w)).owner_id).toBe(w.users.get(owner)!.id);
 return row;
}
export async function expense(w: LedgerWorld, item: string, amount: string, currencyCode = 'JPY', tripName = '日本旅行', categoryName?: string) {
 const row = await seedExpense(w, { item, amount, currencyCode, tripName, categoryName, spentOn: '2027-03-11' });
 w.set(key(`expense:${item}`), row.id);
 w.set(key('expenseId'), row.id);
 w.set(key('tripId'), row.trip_id);
 expect(row.owner_id).toBe(w.users.get('甲')!.id);
 return row;
}
export async function request(w: LedgerWorld, method: string, path: string, body?: unknown, owner = '甲') {
 return callApi(w, method, path, body, owner);
}
export async function body<T = Record<string, unknown>>(w: LedgerWorld): Promise<T> {
 expect(w.response, 'Act must record an HTTP response').toBeDefined();
 return w.response!.json() as Promise<T>;
}
export function status(w: LedgerWorld, expected: number) { expect(w.response?.status()).toBe(expected); }
export async function error(w: LedgerWorld, expected: number, code: string) {
 status(w, expected); expect(await body(w)).toMatchObject({ code });
}
export async function tripRow(w: LedgerWorld): Promise<TripRow> {
 const result = await w.db.query<TripRow>('SELECT *, start_date::text, end_date::text FROM trips WHERE id=$1', [id(w, 'trip')]);
 expect(result.rows).toHaveLength(1); return result.rows[0]!;
}
export async function categoryRow(w: LedgerWorld): Promise<CategoryRow> {
 const result = await w.db.query<CategoryRow>('SELECT * FROM categories WHERE id=$1', [id(w, 'category')]);
 expect(result.rows).toHaveLength(1); return result.rows[0]!;
}
export async function expenseRows(w: LedgerWorld): Promise<ExpenseRow[]> {
 return (await w.db.query<ExpenseRow>('SELECT *, amount_minor::text, spent_on::text FROM expenses WHERE owner_id=$1 ORDER BY id', [w.users.get('甲')!.id])).rows;
}
export async function categoryRows(w: LedgerWorld) {
 return (await w.db.query<CategoryRow>('SELECT * FROM categories WHERE owner_id=$1 ORDER BY id', [w.users.get('甲')!.id])).rows;
}
export async function snapshotCategories(w: LedgerWorld) {
 w.set(key('categoriesBefore'), await categoryRows(w));
 w.set(key('expensesBefore'), await expenseRows(w));
}
export async function snapshotExpenses(w: LedgerWorld) {
 w.set(key('expensesBefore'), await expenseRows(w));
 await request(w, 'GET', `/api/trips/${id(w, 'trip')}/expenses`);
 status(w, 200); w.set(key('expenseListBefore'), await body(w));
 await request(w, 'GET', `/api/trips/${id(w, 'trip')}/totals`);
 status(w, 200); w.set(key('totalsBefore'), await body(w));
}
export async function otherAccountTrip(w: LedgerWorld, startDate?: string) {
 await trip(w, '日本旅行', { startDate }); await login(w, '乙');
}
export async function otherAccountCategory(w: LedgerWorld) { await category(w); await login(w, '乙'); }
export async function deniedResource(w: LedgerWorld, kind: 'trip' | 'category') {
 await error(w, 404, 'NOT_FOUND');
 const text = JSON.stringify(await body(w));
 expect(text).not.toContain(id(w, kind)); expect(text).not.toContain(kind === 'trip' ? '日本旅行' : '餐飲');
 expect((kind === 'trip' ? await tripRow(w) : await categoryRow(w)).owner_id).toBe(w.users.get('甲')!.id);
}
export async function account(w: LedgerWorld) {
 status(w, 200); expect(await body(w)).toEqual({ id: w.users.get('甲')!.id, name: w.users.get('甲')!.name });
 expect((await w.db.query('SELECT user_id FROM auth.session WHERE user_id=$1', [w.users.get('甲')!.id])).rows).not.toHaveLength(0);
}
export async function anonymous(w: LedgerWorld) {
 // A canceled external login supplies no local session and creates no user or ledger.
 await requireProductTable(w, 'auth.session'); await requireProductTable(w, 'trips');
 w.set(key('authBefore'), (await w.db.query('SELECT (SELECT count(*) FROM auth.session)::text AS sessions, (SELECT count(*) FROM trips)::text AS trips')).rows);
}
export async function anonymousAccount(w: LedgerWorld) {
 w.response = await w.api.get('/api/me');
}
export async function deniedAnonymous(w: LedgerWorld) {
 await error(w, 401, 'UNAUTHENTICATED'); expect(await body(w)).not.toHaveProperty('id');
 expect((await w.db.query('SELECT (SELECT count(*) FROM auth.session)::text AS sessions, (SELECT count(*) FROM trips)::text AS trips')).rows).toEqual(w.get(key('authBefore')));
}
export async function prepareSecondDevice(w: LedgerWorld) { w.set(key('secondDevice'), await seedSession(w, '甲')); }
export async function secondDevice(w: LedgerWorld, path: string) {
 const original = w.users.get('甲')!; const device = w.get<import('./world.js').Identity>(key('secondDevice')); 
 expect(device.id).toBe(original.id); expect(device.cookie).not.toBe(original.cookie);
 w.response = await w.api.get(path, { headers: { Cookie: device.cookie } });
}
export async function tripInList(w: LedgerWorld) {
 status(w, 200); const result = await body<{ items: Row[] }>(w);
 expect(result.items).toEqual(expect.arrayContaining([expect.objectContaining({ id: id(w, 'trip'), name: '日本旅行' })]));
 expect((await tripRow(w)).owner_id).toBe(w.users.get('甲')!.id);
}
export async function deniedTripUpdate(w: LedgerWorld) {
 await deniedResource(w, 'trip'); expect((await tripRow(w)).start_date).toBe('2027-03-10');
 await request(w, 'GET', `/api/trips/${id(w, 'trip')}`); status(w, 200); expect(await body(w)).toMatchObject({ startDate: '2027-03-10' });
}
export async function categoryWithExpenses(w: LedgerWorld, name: string, linked = true, count = 2) {
 await category(w, name);
 for (let i = 0; i < count; i++) await expense(w, i === 0 ? '午餐' : '晚餐', '100', 'JPY', i === 0 ? '日本旅行' : '台南旅行', linked ? name : undefined);
 await snapshotCategories(w);
}
export async function createCategory(w: LedgerWorld, name: string) {
 await snapshotCategories(w); const categoryId = randomUUID(); w.set(key('newCategoryId'), categoryId);
 await request(w, 'POST', '/api/categories', { id: categoryId, name });
}
export async function renameCategory(w: LedgerWorld, name: string) {
 await snapshotCategories(w); await request(w, 'PATCH', `/api/categories/${id(w, 'category')}`, { name });
}
export async function deleteCategory(w: LedgerWorld) {
 await snapshotCategories(w); await request(w, 'DELETE', `/api/categories/${id(w, 'category')}`);
}
export async function unchangedCategories(w: LedgerWorld, expectedStatus: number, code: string) {
 await error(w, expectedStatus, code);
 expect(await categoryRows(w)).toEqual(w.get(key('categoriesBefore')));
 expect(await expenseRows(w)).toEqual(w.get(key('expensesBefore')));
 const rows = await categoryRows(w);
 await request(w, 'GET', '/api/categories'); status(w, 200);
 const list = await body<{items: {id:string;name:string}[]}>(w);
 expect(list.items.map(({id, name}) => ({id, name})).sort((a,b) => a.id.localeCompare(b.id))).toEqual(rows.map(({id, name}) => ({id,name})));
 if (w.state.has(key('categoryId'))) {
  await request(w, 'GET', `/api/categories/${id(w, 'category')}`); status(w, 200);
  expect(await body(w)).toMatchObject({ id: id(w, 'category'), name: rows.find(row => row.id === id(w,'category'))!.name });
 }
}
export async function categoryUsage(w: LedgerWorld) {
 status(w, 200); expect(await body(w)).toMatchObject({ id: id(w, 'category'), usageCount: 2 });
 const rows = (await expenseRows(w)).filter(row => row.category_id === id(w, 'category'));
 expect(rows).toHaveLength(2); expect(new Set(rows.map(row => row.trip_id)).size).toBe(2);
 expect(rows.every(row => row.owner_id === w.users.get('甲')!.id)).toBe(true);
}
export async function renamedCategory(w: LedgerWorld) {
 status(w, 200); expect(await body(w)).toMatchObject({ id: id(w, 'category'), name: '吃喝' });
 expect((await categoryRow(w)).name).toBe('吃喝');
 const rows = await expenseRows(w); expect(rows).toHaveLength(2);
 expect(rows.map(row => ({ id: row.id, category_id: row.category_id }))).toEqual(w.get<ExpenseRow[]>(key('expensesBefore')).map(row => ({ id: row.id, category_id: row.category_id })));
 for (const row of rows) {
  await request(w, 'GET', `/api/trips/${row.trip_id}/expenses/${row.id}`); status(w, 200);
  expect(await body(w)).toMatchObject({ category: { id: id(w, 'category'), name: '吃喝' } });
 }
}
export async function deletedCategory(w: LedgerWorld) {
 status(w, 204); expect(await w.response!.text()).toBe('');
 expect((await w.db.query('SELECT id FROM categories WHERE id=$1', [id(w, 'category')])).rows).toHaveLength(0);
 const rows = await expenseRows(w); expect(rows).toHaveLength(2); expect(rows).toEqual(w.get(key('expensesBefore')));
 expect(rows.every(row => row.category_id === null)).toBe(true);
 await request(w, 'GET', '/api/categories'); status(w, 200);
 expect((await body<{items: Row[]}>(w)).items.some(row => row.id === id(w, 'category'))).toBe(false);
}
export async function sameCategory(w: LedgerWorld) {
 status(w, 200); expect(await body(w)).toMatchObject({ id: id(w, 'category'), name: '餐飲' });
 const stable = (rows: CategoryRow[]) => rows.map(({ updated_at: _updatedAt, ...row }) => row);
 expect(stable(await categoryRows(w))).toEqual(stable(w.get<CategoryRow[]>(key('categoriesBefore'))));
 expect(await expenseRows(w)).toEqual(w.get(key('expensesBefore')));
}
export async function savedCategory(w: LedgerWorld, name: string) {
 status(w, 201); const categoryId = w.get<string>(key('newCategoryId'));
 expect(await body(w)).toMatchObject({id: categoryId, name});
 const rows = (await w.db.query('SELECT * FROM categories WHERE id=$1', [categoryId])).rows;
 expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({owner_id: w.users.get('甲')!.id, name});
 await request(w, 'GET', `/api/categories/${categoryId}`); status(w, 200); expect(await body(w)).toMatchObject({id: categoryId, name});
}
export async function ownTransportCategory(w: LedgerWorld) {
 await savedCategory(w, '交通');
 const other = (await w.db.query('SELECT id, owner_id FROM categories WHERE name=$1 AND owner_id=$2', ['交通', w.users.get('乙')!.id])).rows;
 expect(other).toHaveLength(1); expect(other[0].id).not.toBe(w.get(key('newCategoryId')));
}
export async function clearCategory(w: LedgerWorld) {
 w.set(key('expenseBefore'), (await expenseRows(w)).find(row => row.id === id(w, 'expense')));
 await request(w, 'PATCH', `/api/trips/${id(w, 'trip')}/expenses/${id(w, 'expense')}`, {categoryId: null});
}
export async function clearedCategory(w: LedgerWorld) {
 status(w, 200); const prior = w.get<ExpenseRow>(key('expenseBefore'));
 expect(await body(w)).toMatchObject({id: prior.id, tripId: prior.trip_id, item: prior.item, category: null});
 const row = (await expenseRows(w)).find(row => row.id === prior.id)!;
 expect({...row, category_id: prior.category_id, updated_at: prior.updated_at}).toEqual(prior);
 expect(row.category_id).toBeNull();
 await request(w, 'GET', `/api/trips/${prior.trip_id}/expenses/${prior.id}`); status(w,200);
 expect(await body(w)).toMatchObject({id: prior.id, tripId: prior.trip_id, item: '午餐', amount: '100', currencyCode: 'JPY', category: null});
}
export async function currencySnapshot(w: LedgerWorld) {
 await requireProductTable(w, 'currencies');
 const source = JSON.parse(await readFile(new URL('../../../../packages/shared/data/source.json', import.meta.url), 'utf8')) as {sha256:string;published:string;codes:number};
 const xml = await readFile(new URL('../../../../packages/shared/data/list-one.xml', import.meta.url));
 expect(createHash('sha256').update(xml).digest('hex')).toBe(source.sha256);
 const catalog = JSON.parse(await readFile(new URL('../../../../packages/shared/data/currencies.json', import.meta.url), 'utf8')) as {code:string;name:string;minorUnit:number}[];
 const rows = (await w.db.query('SELECT code, name, minor_unit, snapshot_date::text FROM currencies WHERE is_selectable ORDER BY code')).rows;
 expect(rows).toHaveLength(source.codes);
 expect(rows).toEqual(catalog.map(row => ({code: row.code, name: row.name, minor_unit: row.minorUnit, snapshot_date: source.published})));
 w.set(key('currencyRows'), rows);
 w.set(key('snapshotDate'), source.published);
}
export async function currencyResult(w: LedgerWorld) {
 status(w, 200); const result = await body<{snapshotDate:string;items:{code:string;name:string;minorUnit:number}[]}>(w);
 expect(result.snapshotDate).toBe(w.get(key('snapshotDate')));
 expect(result.items).toEqual(w.get<{code:string;name:string;minor_unit:number}[]>(key('currencyRows')).map(row => ({code:row.code,name:row.name,minorUnit:row.minor_unit})));
 expect(result.items.find(row => row.code === 'JPY')?.minorUnit).toBe(0);
 expect(result.items.find(row => row.code === 'USD')?.minorUnit).toBe(2);
}
export async function createExpense(w: LedgerWorld, item: string, amount: string, currencyCode = 'JPY', spentOn = '2027-03-11') {
 await snapshotExpenses(w); const expenseId = randomUUID(); w.set(key('expenseId'), expenseId);
 await request(w, 'POST', `/api/trips/${id(w, 'trip')}/expenses`, {id: expenseId, item, amount, currencyCode, spentOn});
}
export async function updateExpense(w: LedgerWorld, item: string, amount: string, currencyCode: string) {
 w.set(key('expenseId'), w.get(key(`expense:${item}`)));
 await request(w, 'PATCH', `/api/trips/${id(w, 'trip')}/expenses/${id(w, 'expense')}`, {amount,currencyCode});
}
export async function deleteExpense(w: LedgerWorld) {
 w.set(key('expenseId'), w.get(key('expense:住宿')));
 await request(w, 'DELETE', `/api/trips/${id(w, 'trip')}/expenses/${id(w, 'expense')}`);
}
export async function savedExpense(w: LedgerWorld, item: string, amount: string, currencyCode: string, minorUnit: number, amountMinor: string, spentOn = '2027-03-11') {
 status(w,201);
 const view = {id:id(w,'expense'),tripId:id(w,'trip'),item,amount,currencyCode,minorUnit,spentOn,category:null};
 expect(await body(w)).toMatchObject(view);
 const rows = await expenseRows(w); const row = rows.find(row => row.id === id(w,'expense'));
 expect(row).toMatchObject({owner_id:w.users.get('甲')!.id,trip_id:id(w,'trip'),item,amount_minor:amountMinor,currency_code:currencyCode,minor_unit:minorUnit,spent_on:spentOn,category_id:null});
 await request(w,'GET',`/api/trips/${id(w,'trip')}/expenses/${id(w,'expense')}`); status(w,200); expect(await body(w)).toMatchObject(view);
}
function decimal(minor: bigint, unit: number) {
 const text = minor.toString().padStart(unit + 1, '0'); return unit ? `${text.slice(0,-unit)}.${text.slice(-unit)}` : text;
}
export async function totals(w: LedgerWorld, expected: Record<string,string>, actStatus: number) {
 status(w,actStatus);
 const rows = (await expenseRows(w)).filter(row => row.trip_id === id(w,'trip'));
 const grouped = new Map<string,{amount:bigint;unit:number}>();
 for (const row of rows) {
  const prior = grouped.get(row.currency_code) ?? {amount:0n,unit:row.minor_unit};
  const unit = Math.max(prior.unit,row.minor_unit);
  grouped.set(row.currency_code,{unit,amount:prior.amount * 10n ** BigInt(unit-prior.unit) + BigInt(row.amount_minor) * 10n ** BigInt(unit-row.minor_unit)});
 }
 const authoritative = [...grouped].map(([currencyCode,{unit,amount}])=>({currencyCode,amount:decimal(amount,unit),minorUnit:unit})).sort((a,b)=>a.currencyCode.localeCompare(b.currencyCode));
 expect(Object.fromEntries(authoritative.map(row=>[row.currencyCode,row.amount]))).toEqual(expected);
 // Always re-read after a mutation; a GET action is checked before this call as well.
 if(actStatus === 200 && (await body(w)).totals) expect((await body<{totals:Total[]}>(w)).totals.sort((a,b)=>a.currencyCode.localeCompare(b.currencyCode))).toEqual(authoritative);
 await request(w,'GET',`/api/trips/${id(w,'trip')}/totals`); status(w,200);
 expect((await body<{totals:Total[]}>(w)).totals.sort((a,b)=>a.currencyCode.localeCompare(b.currencyCode))).toEqual(authoritative);
}
export async function updatedExpenseTotals(w: LedgerWorld, item: string, amountMinor: string, expected: Record<string,string>) {
 status(w,200); expect(await body(w)).toMatchObject({id:w.get(key(`expense:${item}`)),currencyCode:'JPY',amount:amountMinor,minorUnit:0});
 expect((await expenseRows(w)).find(row=>row.id===w.get(key(`expense:${item}`)))).toMatchObject({amount_minor:amountMinor,currency_code:'JPY',minor_unit:0});
 await totals(w,expected,200);
}
export async function deletedExpense(w: LedgerWorld) {
 status(w,204); expect(await w.response!.text()).toBe('');
 expect((await expenseRows(w)).some(row=>row.id===id(w,'expense'))).toBe(false);
 await request(w,'GET',`/api/trips/${id(w,'trip')}/expenses`); status(w,200);
 expect((await body<{items:Row[]}>(w)).items.some(row=>row.id===id(w,'expense'))).toBe(false);
 await request(w,'GET',`/api/trips/${id(w,'trip')}/expenses/${id(w,'expense')}`); await error(w,404,'NOT_FOUND');
}
export async function deletedExpenseTotals(w: LedgerWorld) {
 status(w,204); expect((await expenseRows(w)).some(row=>row.item==='住宿')).toBe(false);
 await totals(w,{JPY:'10500'},204);
}
export async function rejectedExpense(w: LedgerWorld, noLunch = false) {
 await error(w,400,'VALIDATION_ERROR');
 expect(await expenseRows(w)).toEqual(w.get(key('expensesBefore')));
 if(noLunch) expect((await expenseRows(w)).some(row=>row.item==='午餐')).toBe(false);
 await request(w,'GET',`/api/trips/${id(w,'trip')}/expenses`); status(w,200); expect(await body(w)).toEqual(w.get(key('expenseListBefore')));
 await request(w,'GET',`/api/trips/${id(w,'trip')}/totals`); status(w,200); expect(await body(w)).toEqual(w.get(key('totalsBefore')));
}
export async function expenseInList(w: LedgerWorld) {
 status(w,200); const rows = (await body<{items:ExpenseView[]}>(w)).items;
 expect(rows).toEqual(expect.arrayContaining([expect.objectContaining({id:id(w,'expense'),tripId:id(w,'trip'),item:'午餐',currencyCode:'JPY',amount:'1200',minorUnit:0})]));
 expect((await expenseRows(w)).find(row=>row.id===id(w,'expense'))).toMatchObject({owner_id:w.users.get('甲')!.id,amount_minor:'1200',minor_unit:0});
}
export async function createTrip(w: LedgerWorld, name: string, dates: {startDate?:string;endDate?:string} = {}) {
 const tripId = randomUUID(); w.set(key('tripId'),tripId);
 await request(w,'POST','/api/trips',{id:tripId,name,...dates});
}
export async function tripDates(w: LedgerWorld, name: string, startDate: string|null, endDate: string|null, responseStatus = 201) {
 status(w,responseStatus); const expected = {id:id(w,'trip'),name,startDate,endDate};
 expect(await body(w)).toMatchObject(expected);
 expect(await tripRow(w)).toMatchObject({owner_id:w.users.get('甲')!.id,name,start_date:startDate,end_date:endDate});
 await request(w,'GET',`/api/trips/${id(w,'trip')}`); status(w,200); expect(await body(w)).toMatchObject(expected);
}
export async function rejectedTripDates(w: LedgerWorld) {
 await error(w,400,'VALIDATION_ERROR');
 expect(await tripRow(w)).toMatchObject({start_date:'2027-03-10',end_date:null});
 await request(w,'GET',`/api/trips/${id(w,'trip')}`); status(w,200); expect(await body(w)).toMatchObject({startDate:'2027-03-10',endDate:null});
}
