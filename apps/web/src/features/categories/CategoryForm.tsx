import { Input } from '../../components/ui/input.js';
import { Button } from '../../components/ui/button.js';
import { ActionButton } from '../../components/waiting/ActionButton.js';
import React, { useId, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, ApiError, type Category } from '../../api/index.js';
import { FormDialog } from '../../components/FormDialog.js';
import { useTranslation } from 'react-i18next';
import { registerInterfaceMessages } from '../../i18n/runtime.js';

registerInterfaceMessages('categoryForm', {
  unknown: [
    '保存結果尚未確認，請重新整理確認。',
    'Save status unconfirmed. Select Check status to verify.',
  ],
  required: ['請輸入分類名稱。', 'Enter a category name.'],
  tooLong: ['分類名稱最多 30 個字。', 'Category names can have up to 30 characters.'],
  duplicate: ['已有相同名稱的分類。', 'This category name is already in use.'],
  renameTitle: ['分類改名', 'Rename category'],
  addTitle: ['新增分類', 'Add category'],
  name: ['分類名稱', 'Category name'],
  placeholder: ['例如：餐飲', 'For example: Dining'],
  hint: ['所有旅行共用，最多 30 個字。', 'Shared across all trips, up to 30 characters.'],
  verify: ['重新查證', 'Check status'],
  cancel: ['取消', 'Cancel'],
  save: ['儲存', 'Save'],
});

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
  const { t } = useTranslation();
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
        throw new Error(t('categoryForm.unknown'), { cause: failure });
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
      else setError(t('categoryForm.unknown'));
    },
    onError: () => setError(t('categoryForm.unknown')),
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
      ? t('categoryForm.required')
      : [...trimmed].length > 30
        ? t('categoryForm.tooLong')
        : categories.some(
              (existing) => existing.id !== id && nameKey(existing.name) === nameKey(trimmed),
            )
          ? t('categoryForm.duplicate')
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
    <FormDialog
      title={t(category ? 'categoryForm.renameTitle' : 'categoryForm.addTitle')}
      onClose={onClose}
      busy={busy}
    >
      <form noValidate onSubmit={submit}>
        <div className="field">
          <label htmlFor={fieldId}>{t('categoryForm.name')}</label>
          <Input
            id={fieldId}
            ref={input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('categoryForm.placeholder')}
            required
            disabled={busy || Boolean(unconfirmed)}
            aria-invalid={Boolean(error)}
            aria-describedby={`${fieldId}-hint ${fieldId}-error`}
          />
          <p id={`${fieldId}-hint`} className="field-hint">
            {t('categoryForm.hint')}
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
            {t('categoryForm.verify')}
          </Button>
        ) : null}
        <div className="form-actions">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
            {t('categoryForm.cancel')}
          </Button>
          <ActionButton
            busy={busy}
            label={t('categoryForm.save')}
            variant="default"
            disabled={busy || Boolean(unconfirmed)}
          />
        </div>
      </form>
    </FormDialog>
  );
}
