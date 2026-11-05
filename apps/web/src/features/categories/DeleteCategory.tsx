import React, { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, ApiError, type Category } from '../../api/index.js';
import { FormDialog } from '../../components/FormDialog.js';

export function DeleteCategory({ category, onClose, onDeleted }: { category: Category; onClose: () => void; onDeleted: () => Promise<void> }) {
  const [error, setError] = useState(''), [unconfirmed, setUnconfirmed] = useState(false);
  const writing = useRef(false);
  async function verify() {
    try { await apiRequest<Category>(`/api/categories/${category.id}`); }
    catch (failure) { return failure instanceof ApiError && failure.status === 404; }
    return false;
  }
  const deletion = useMutation({
    mutationFn: async () => {
      try { await apiRequest<void>(`/api/categories/${category.id}`, { method: 'DELETE' }); }
      catch (failure) {
        if (failure instanceof ApiError && failure.status < 500) throw failure;
        if (await verify()) return;
        setUnconfirmed(true); throw new Error('刪除結果尚未確認，請重新整理確認。', { cause: failure });
      }
    },
    onSuccess: onDeleted, onError: failure => setError(failure.message), onSettled: () => { writing.current = false; },
  });
  const verification = useMutation({
    mutationFn: verify,
    onSuccess: async confirmed => { if (confirmed) await onDeleted(); else setError('刪除結果尚未確認，請重新整理確認。'); },
    onSettled: () => { writing.current = false; },
  });
  const busy = deletion.isPending || verification.isPending;
  return <FormDialog title={category.usageCount ? '這個分類還在旅途中' : '刪除這個分類？'} onClose={onClose} busy={busy}>
    {category.usageCount ? <><p>「{category.name}」仍用於 {category.usageCount} 筆支出，暫時不能刪除。</p><p className="muted">請先在支出中更換分類，或改為未分類。</p><div className="form-actions"><button className="btn" onClick={onClose}>知道了</button></div></> : <>
      <p>「{category.name}」尚未被任何支出使用。確認刪除這個分類？原支出仍會保留。</p>
      <p className="error" role="alert">{error}</p>
      {unconfirmed ? <button type="button" className="btn secondary" disabled={busy} onClick={() => { if (!writing.current) { writing.current = true; verification.mutate(); } }}>重新查證</button> : null}
      <div className="form-actions"><button type="button" className="btn secondary" disabled={busy} onClick={onClose}>取消</button><button type="button" className="btn danger" disabled={busy || unconfirmed} onClick={() => { if (!writing.current) { writing.current = true; deletion.mutate(); } }}>{deletion.isPending ? '刪除中…' : '確認刪除'}</button></div>
    </>}
  </FormDialog>;
}
