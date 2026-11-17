import { Input } from '../../components/ui/input.js';
import { Button } from '../../components/ui/button.js';
import { ActionButton } from '../../components/waiting/ActionButton.js';
import React, { useId, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, ApiError, type Category } from '../../api/index.js';
import { FormDialog } from '../../components/FormDialog.js';

function nameKey(value: string) {
  return value.trim().replace(/[A-Z]/g, (character) => character.toLowerCase());
}

export function CategoryForm({
  category,
  categories,
  onClose,
  onSaved,
}: {
  category?: Category;
  categories: Category[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [id] = useState(() => category?.id ?? crypto.randomUUID());
  const [name, setName] = useState(category?.name ?? ''),
    [error, setError] = useState('');
  const [unconfirmed, setUnconfirmed] = useState<string | null>(null);
  const fieldId = useId(),
    input = useRef<HTMLInputElement>(null),
    writing = useRef(false);

  async function verify(expected: string) {
    try {
      const saved = await apiRequest<Category>(`/api/categories/${id}`);

      return saved.id === id && saved.name === expected;
    } catch {
      return false;
    }
  }

  const save = useMutation({
    mutationFn: async (trimmed: string) => {
      try {
        await apiRequest<Category>(category ? `/api/categories/${id}` : '/api/categories', {
          method: category ? 'PATCH' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(category ? { name: trimmed } : { id, name: trimmed }),
        });
      } catch (failure) {
        if (failure instanceof ApiError && failure.status < 500) throw failure;
        if (await verify(trimmed)) return;

        setUnconfirmed(trimmed);
        throw new Error('保存結果尚未確認，請重新整理確認。', { cause: failure });
      }
    },
    onSuccess: onSaved,
    onError: (failure) => setError(failure.message),
    onSettled: () => {
      writing.current = false;
    },
  });

  const verification = useMutation({
    mutationFn: verify,
    onSuccess: async (confirmed) => {
      if (confirmed) await onSaved();
      else setError('保存結果尚未確認，請重新整理確認。');
    },
    onError: () => setError('保存結果尚未確認，請重新整理確認。'),
    onSettled: () => {
      writing.current = false;
    },
  });

  const busy = save.isPending || verification.isPending;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (writing.current || unconfirmed) return;

    const trimmed = name.trim();
    const invalid = !trimmed
      ? '請輸入分類名稱。'
      : [...trimmed].length > 30
        ? '分類名稱最多 30 個字。'
        : categories.some(
              (existing) => existing.id !== id && nameKey(existing.name) === nameKey(trimmed),
            )
          ? '已有相同名稱的分類。'
          : '';

    setError(invalid);
    if (invalid) {
      input.current?.focus();

      return;
    }

    writing.current = true;
    save.mutate(trimmed);
  }

  return (
    <FormDialog title={category ? '分類改名' : '新增分類'} onClose={onClose} busy={busy}>
      <form noValidate onSubmit={submit}>
        <div className="field">
          <label htmlFor={fieldId}>分類名稱</label>
          <Input
            id={fieldId}
            ref={input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：餐飲"
            required
            disabled={busy || Boolean(unconfirmed)}
            aria-invalid={Boolean(error)}
            aria-describedby={`${fieldId}-hint ${fieldId}-error`}
          />
          <p id={`${fieldId}-hint`} className="field-hint">
            所有旅行共用，最多 30 個字。
          </p>
          <p id={`${fieldId}-error`} className="error" role="alert">
            {error}
          </p>
        </div>
        {unconfirmed ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              if (!writing.current) {
                writing.current = true;
                verification.mutate(unconfirmed);
              }
            }}
          >
            重新查證
          </Button>
        ) : null}
        <div className="form-actions">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
            取消
          </Button>
          <ActionButton
            busy={busy}
            label="儲存"
            variant="default"
            disabled={busy || Boolean(unconfirmed)}
          />
        </div>
      </form>
    </FormDialog>
  );
}
