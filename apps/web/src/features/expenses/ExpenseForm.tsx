import React, { useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { parseMoney } from '@split-ledger/shared';
import { apiRequest, ApiError, type Trip, type CurrencyList, type Expense, type Category, type ItemList } from '../../api/index.js';
import { DateField } from '../../components/DateField.js';
import { dateOnly, localToday, parseDate } from '../../components/date.js';
import { QueryState } from '../../components/QueryState.js';
import { SearchCombo } from '../../components/SearchCombo.js';
import { FormDialog } from '../../components/FormDialog.js';
import { useSession } from '../auth/session.js';
import { displayAmount } from './money.js';
import { definitelyRejected, OfflineWrite, UnconfirmedWrite, unconfirmedMessage, verifiedDelete, verifiedSave, type SaveIntent, type WriteIntent } from './save-outcome.js';

type FieldErrors = Partial<Record<'item' | 'currency' | 'amount' | 'date', string>>;
export function ExpenseForm() {
  const { tripId, expenseId } = useParams(), { account } = useSession();
  const trip = useQuery({ queryKey: ['account', account!.id, 'trip', tripId], queryFn: ({ signal }) => apiRequest<Trip>(`/api/trips/${tripId}`, { signal }) });
  const expense = useQuery({ queryKey: ['account', account!.id, 'expense', tripId, expenseId], queryFn: ({ signal }) => apiRequest<Expense>(`/api/trips/${tripId}/expenses/${expenseId}`, { signal }), enabled: Boolean(expenseId) });
  if (!trip.data || (expenseId && !expense.data)) return <><Link className="back" to={tripId ? `/trips/${tripId}` : '/trips'}>返回旅行帳本</Link><QueryState pending={trip.isPending || Boolean(expenseId && expense.isPending)} error={trip.error ?? expense.error} retry={() => { void trip.refetch(); if (expenseId) void expense.refetch(); }} /></>;
  return <ExpenseEditor key={`${account!.id}:${tripId}:${expenseId ?? 'new'}`} trip={trip.data} expense={expense.data} readError={trip.error ?? expense.error} />;
}

function ExpenseEditor({ trip, expense, readError }: { trip: Trip; expense?: Expense; readError: Error | null }) {
  const { account } = useSession(), navigate = useNavigate(), client = useQueryClient();
  const tripId = trip.id;
  const itemId = useId(), amountId = useId();
  const itemInput = useRef<HTMLInputElement>(null), amountInput = useRef<HTMLInputElement>(null), writing = useRef(false);
  const [id] = useState(() => expense?.id ?? crypto.randomUUID());
  const [item, setItem] = useState(expense?.item ?? ''), [currency, setCurrency] = useState(expense?.currencyCode ?? 'JPY'), [amount, setAmount] = useState(expense?.amount ?? ''), [category, setCategory] = useState(expense?.category?.id ?? '');
  const [date, setDate] = useState(() => (expense?.spentOn ?? dateOnly(localToday())).replaceAll('-', '/'));
  const [errors, setErrors] = useState<FieldErrors>({}), [saveError, setSaveError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState<WriteIntent | null>(null);
  const currencies = useQuery({ queryKey: ['currencies'], queryFn: ({ signal }) => apiRequest<CurrencyList>('/api/currencies', { signal }) });
  const categories = useQuery({ queryKey: ['account', account!.id, 'categories'], queryFn: ({ signal }) => apiRequest<ItemList<Category>>('/api/categories', { signal }) });
  const precision = expense?.currencyCode === currency ? expense.minorUnit : currencies.data?.items.find(option => option.code === currency)?.minorUnit;
  const digits = currency === 'TWD' ? 0 : precision;
  function accepted(value: string) { return digits !== undefined && value.length <= 25 && (digits === 0 ? /^\d*$/ : new RegExp(`^\\d*(?:\\.\\d{0,${digits}})?$`)).test(value); }
  function removesCharacters(next: string) {
    if (next.length >= amount.length || accepted(amount)) return false;
    let index = 0;
    while (index < next.length && amount[index] === next[index]) index++;
    return amount.slice(index + amount.length - next.length) === next.slice(index);
  }
  const currencyOptions = currencies.data?.items.map(option => ({ value: option.code, label: `${option.code} · ${option.name}` })) ?? [];
  if (expense && !currencyOptions.some(option => option.value === expense.currencyCode)) currencyOptions.push({ value: expense.currencyCode, label: `${expense.currencyCode} · 已保存幣別` });
  async function saved(message: string) {
    await Promise.all(['trip', 'trips', 'expense', 'expenses', 'totals', 'categories'].map(resource => client.invalidateQueries({ queryKey: ['account', account!.id, resource] })));
    navigate(`/trips/${tripId}`, { state: { message } });
  }
  const mutation = useMutation({
    mutationFn: async (spentOn: string) => {
      if (!navigator.onLine) throw new OfflineWrite('save');
      const intent: SaveIntent = { kind: 'save', id, tripId, item: item.trim(), spentOn, currencyCode: currency, minorUnit: precision!, amountMinor: parseMoney(amount, precision!).toString(), categoryId: category || null };
      const payload = { item: item.trim(), spentOn, categoryId: category || null,
        ...(!expense || amount !== expense.amount ? { amount } : {}),
        ...(!expense || currency !== expense.currencyCode ? { currencyCode: currency } : {}),
        ...(!expense ? { id } : {}),
      };
      try {
        return await apiRequest<Expense>(`/api/trips/${tripId}/expenses${expense ? `/${id}` : ''}`, {
          method: expense ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
        });
      } catch (error) {
        if (definitelyRejected(error)) throw error;
        // The original UUID is queried after an unavailable response; no mutation is retried.
        const confirmed = await verifiedSave(intent);
        if (confirmed) return confirmed;
        throw new UnconfirmedWrite(intent, error);
      }
    },
    onSuccess: () => saved('支出已保存'),
    onError: error => {
      setSaveError(error.message);
      if (error instanceof UnconfirmedWrite) setUnconfirmed(error.intent);
      if (error instanceof ApiError && error.field) {
        const field = error.field === 'currencyCode' ? 'currency' : error.field === 'spentOn' ? 'date' : error.field;
        if (['item', 'currency', 'amount', 'date'].includes(field)) setErrors(previous => ({ ...previous, [field]: error.message }));
      }
    },
    onSettled: () => { writing.current = false; },
  });
  const deletion = useMutation({
    mutationFn: async () => {
      if (!navigator.onLine) throw new OfflineWrite('delete');
      try { await apiRequest<void>(`/api/trips/${tripId}/expenses/${id}`, { method: 'DELETE' }); }
      catch (error) {
        if (definitelyRejected(error)) throw error;
        // An unavailable response does not justify a second DELETE.
        const intent = { kind: 'delete' as const, id, tripId };
        if (await verifiedDelete(intent)) return;
        throw new UnconfirmedWrite(intent, error);
      }
    },
    onSuccess: () => saved('支出已刪除'),
    onError: error => { setSaveError(error.message); if (error instanceof UnconfirmedWrite) setUnconfirmed(error.intent); },
    onSettled: () => { writing.current = false; },
  });
  const verification = useMutation({
    mutationFn: async (intent: WriteIntent) => intent.kind === 'save' ? Boolean(await verifiedSave(intent)) : verifiedDelete(intent),
    onSuccess: async (confirmed, intent) => {
      if (confirmed) { await saved(intent.kind === 'save' ? '支出已保存' : '支出已刪除'); }
      else setSaveError(unconfirmedMessage(intent.kind));
    },
    onSettled: () => { writing.current = false; },
  });
  const busy = mutation.isPending || deletion.isPending || verification.isPending;
  function recheck() { if (unconfirmed && !writing.current) { writing.current = true; verification.mutate(unconfirmed); } }
  function submit(event: React.FormEvent) {
    event.preventDefault(); if (writing.current || unconfirmed) return;
    const validation: FieldErrors = {};
    if (!item.trim()) validation.item = '請填寫支出項目。';
    if (precision === undefined || currencies.error) validation.currency = '請從可用目錄選擇幣別。';
    try { if (precision === undefined) throw new RangeError(); if (!expense || amount !== expense.amount || currency !== expense.currencyCode) parseMoney(amount, precision, currency); }
    catch { validation.amount = '請輸入符合幣別位數且大於零的正數金額。'; }
    const parsed = parseDate(date);
    if (!parsed) validation.date = '請輸入有效的支出日期，例如 2027/03/11。';
    setErrors(validation); setSaveError('');
    if (Object.keys(validation).length) {
      if (validation.item) itemInput.current?.focus(); else if (validation.amount) amountInput.current?.focus();
      return;
    }
    if (!navigator.onLine) { setSaveError('目前無法連線，這筆支出尚未保存。請保留畫面並在連線後再試。'); return; }
    writing.current = true; mutation.mutate(dateOnly(parsed!));
  }
  return <>
    <Link className="back" to={`/trips/${tripId}`}>{trip.name}</Link>
    <header className="page-head"><div><div className="eyebrow">LITTLE DETAILS, WELL KEPT</div><h1>{expense ? '編輯這筆花費' : '記下這一刻的花費。'}</h1><p className="muted">{expense ? '修正紀錄，讓帳本更準確。' : '每一筆小事，都是旅程的一部分。'}</p></div></header>
    {readError ? <p className="error" role="alert">暫時無法更新已保存資料，請保留草稿後再試。</p> : null}
    <form className="form-panel" noValidate onSubmit={submit}>
      <fieldset disabled={busy || Boolean(unconfirmed)}>
        <div className="field"><label htmlFor={itemId}>支出項目</label><input id={itemId} ref={itemInput} value={item} onChange={event => setItem(event.target.value)} placeholder="例如：巷口的拉麵店" aria-invalid={Boolean(errors.item)} aria-describedby={errors.item ? `${itemId}-error` : undefined} required /><p id={`${itemId}-error`} className="error">{errors.item}</p></div>
        <SearchCombo label="幣別" value={currency} options={currencyOptions} onChange={value => {
          setCurrency(value);
          const nextPrecision = expense?.currencyCode === value ? expense.minorUnit : currencies.data?.items.find(option => option.code === value)?.minorUnit;
          const nextDigits = value === 'TWD' ? 0 : nextPrecision;
          const unchanged = expense?.currencyCode === value && expense.amount === amount;
          const incompatible = !unchanged && value && amount && nextDigits !== undefined && !(nextDigits === 0 ? /^\d*$/ : new RegExp(`^\\d*(?:\\.\\d{0,${nextDigits}})?$`)).test(amount);
          setErrors(previous => ({ ...previous, currency: undefined, amount: incompatible ? '目前金額不符合新幣別的小數位數，請手動修正。' : undefined }));
        }} error={errors.currency} disabled={currencies.isPending || Boolean(currencies.error)} />
        {currencies.error ? <p className="error" role="alert">無法取得幣別目錄，請保留草稿。<button className="text-btn" type="button" onClick={() => { void currencies.refetch(); }}>重新取得幣別</button></p> : null}
        <div className="field"><label htmlFor={amountId}>金額</label><input id={amountId} ref={amountInput} className="money-input" inputMode={digits === 0 ? 'numeric' : 'decimal'} autoComplete="off" placeholder="0" value={amount}
          aria-describedby={`${amountId}-hint ${amountId}-error`} aria-invalid={Boolean(errors.amount)} required
          onChange={event => {
            const next = event.target.value;
            if (accepted(next) || removesCharacters(next)) { setAmount(next); setErrors(previous => ({ ...previous, amount: accepted(next) ? undefined : '目前金額不符合新幣別的小數位數，請手動修正。' })); }
            else setErrors(previous => ({ ...previous, amount: '請輸入符合幣別位數的正數金額。' }));
          }}
          onPaste={event => {
            const input = event.currentTarget;
            const next = amount.slice(0, input.selectionStart ?? 0) + event.clipboardData.getData('text') + amount.slice(input.selectionEnd ?? amount.length);
            if (!accepted(next)) { event.preventDefault(); setErrors(previous => ({ ...previous, amount: '貼上的金額不符合幣別位數，已保留原值。' })); }
          }} />
          <p id={`${amountId}-hint`} className="field-hint">{digits === undefined ? '請先選擇幣別。' : digits ? `${currency} 最多 ${digits} 位小數` : `${currency} 使用整數金額`}</p>
          <p id={`${amountId}-error`} className="error" role="status">{errors.amount}</p>
        </div>
        <div className="two-col"><DateField label="支出日期" value={date} onChange={setDate} error={errors.date} />
          <div><SearchCombo label="分類" value={category} options={[{ value: '', label: '未分類' }, ...(categories.data?.items.map(option => ({ value: option.id, label: option.name })) ?? [])]} onChange={setCategory} optional disabled={categories.isPending || Boolean(categories.error)} />
            {categories.error ? <p className="error" role="alert">暫時無法取得分類。<button type="button" className="text-btn" onClick={() => { void categories.refetch(); }}>重新取得分類</button></p> : null}
          </div>
        </div>
      </fieldset>
      <p className="error" role="alert">{saveError}</p>
      {unconfirmed && !deleting ? <button className="btn secondary" type="button" disabled={busy} onClick={recheck}>{verification.isPending ? '查證中…' : '重新查證'}</button> : null}
      <div className="form-actions">{expense ? <button className="text-btn danger delete-expense" type="button" disabled={busy || Boolean(unconfirmed)} onClick={() => { setSaveError(''); setDeleting(true); }}>刪除支出</button> : null}<Link className="btn secondary" aria-disabled={busy} onClick={event => { if (busy) event.preventDefault(); }} to={`/trips/${tripId}`}>取消</Link><button className="btn" disabled={busy || Boolean(unconfirmed) || currencies.isPending || Boolean(currencies.error)}>{mutation.isPending ? '儲存中…' : '儲存支出'}</button></div>
    </form>
    {deleting && expense ? <FormDialog title="刪除這筆支出？" onClose={() => setDeleting(false)} busy={busy}>
      <p>確定刪除「{expense.item}」{expense.currencyCode} {displayAmount(expense.amount)}？此操作無法復原。</p>
      <p className="error" role="alert">{saveError}</p>
      {unconfirmed ? <button className="btn secondary" type="button" disabled={busy} onClick={recheck}>{verification.isPending ? '查證中…' : '重新查證'}</button> : null}
      <div className="form-actions"><button className="btn secondary" type="button" disabled={busy} onClick={() => setDeleting(false)}>取消</button><button className="btn danger" type="button" disabled={busy || Boolean(unconfirmed)} onClick={() => { if (!writing.current && !unconfirmed) { writing.current = true; deletion.mutate(); } }}>{deletion.isPending ? '刪除中…' : '確認刪除'}</button></div>
    </FormDialog> : null}
  </>;
}
