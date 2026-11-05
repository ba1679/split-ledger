import React, { useId, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiRequest, ApiError, type Trip } from '../../api/index.js';
import { useSession } from '../auth/session.js';
import { FormDialog } from '../../components/FormDialog.js';
import { DateField } from '../../components/DateField.js';
import { dateOnly, parseDate } from '../../components/date.js';

export function TripForm({ trip, onClose }: { trip?: Trip; onClose: () => void }) {
  const { account } = useSession(), client = useQueryClient(), navigate = useNavigate();
  const inputId = useId(), nameInput = useRef<HTMLInputElement>(null);
  const [id] = useState(() => trip?.id ?? crypto.randomUUID());
  const [name, setName] = useState(trip?.name ?? '');
  const [start, setStart] = useState(trip?.startDate?.replaceAll('-', '/') ?? '');
  const [end, setEnd] = useState(trip?.endDate?.replaceAll('-', '/') ?? '');
  const [validation, setValidation] = useState('');
  const mutation = useMutation({
    mutationFn: async (dates: { startDate: string | null; endDate: string | null }) => {
      try {
        return await apiRequest<Trip>(trip ? `/api/trips/${id}` : '/api/trips', {
          method: trip ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify(trip ? dates : { id, name: name.trim(), ...dates }),
        });
      } catch (error) {
        if (error instanceof ApiError) throw error;
        // A lost response is checked using the original UUID instead of issuing another mutation.
        try {
          const saved = await apiRequest<Trip>(`/api/trips/${id}`);
          if (saved.startDate === dates.startDate && saved.endDate === dates.endDate && (trip || saved.name === name.trim())) return saved;
        } catch { /* Keep the original draft and UUID when the result cannot be verified. */ }
        throw new Error('保存結果尚未確認，請重新整理確認。', { cause: error });
      }
    },
    onSuccess: async saved => {
      client.setQueryData(['account', account!.id, 'trip', saved.id], saved);
      await client.invalidateQueries({ queryKey: ['account', account!.id, 'trips'] });
      onClose(); navigate(`/trips/${saved.id}`);
    },
  });
  function submit(event: React.FormEvent) {
    event.preventDefault(); if (mutation.isPending) return;
    if (!name.trim()) { setValidation('請填寫旅行名稱。'); nameInput.current?.focus(); return; }
    const parsedStart = parseDate(start), parsedEnd = parseDate(end);
    if ((start.trim() && !parsedStart) || (end.trim() && !parsedEnd)) { setValidation('請輸入有效日期，例如 2027/03/11。'); return; }
    const startDate = parsedStart ? dateOnly(parsedStart) : null, endDate = parsedEnd ? dateOnly(parsedEnd) : null;
    if (startDate && endDate && endDate < startDate) { setValidation('結束日不能早於開始日。'); return; }
    setValidation(''); mutation.mutate({ startDate, endDate });
  }
  return <FormDialog title={trip ? '旅行日期' : '新增旅行'} onClose={onClose} busy={mutation.isPending}>
    <form noValidate onSubmit={submit}>
      {!trip ? <div className="field"><label htmlFor={inputId}>旅行名稱</label><input id={inputId} ref={nameInput} value={name} onChange={event => setName(event.target.value)} placeholder="例如：日本春日旅行" required /></div> : null}
      <div className="two-col"><DateField label="開始日" value={start} onChange={setStart} optional /><DateField label="結束日" value={end} onChange={setEnd} optional /></div>
      <p className="error" role="alert">{validation || mutation.error?.message}</p>
      <div className="form-actions"><button type="button" className="btn secondary" disabled={mutation.isPending} onClick={onClose}>取消</button><button className="btn" disabled={mutation.isPending}>{mutation.isPending ? '儲存中…' : trip ? '儲存日期' : '建立旅行'}</button></div>
    </form>
  </FormDialog>;
}
