import { Button } from '../../components/ui/button.js';
import { ActionButton } from '../../components/waiting/ActionButton.js';
import React, { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, ApiError, type Category } from '../../api/index.js';
import { FormDialog } from '../../components/FormDialog.js';
import { useTranslation } from 'react-i18next';
import { registerInterfaceMessages } from '../../i18n/runtime.js';

registerInterfaceMessages('deleteCategory', {
  unknown: [
    '刪除結果尚未確認，請重新整理確認。',
    'Deletion status unconfirmed. Select Check status to verify.',
  ],
  inUseTitle: ['這個分類還在旅途中', 'This category is still in use'],
  deleteTitle: ['刪除這個分類？', 'Delete this category?'],
  inUse: [
    '「{{name}}」仍用於 {{count}} 筆支出，暫時不能刪除。',
    '“{{name}}” is used in {{count}} expenses and cannot be deleted yet.',
  ],
  changeFirst: [
    '請先在支出中更換分類，或改為未分類。',
    'Change the category on those expenses or mark them uncategorized first.',
  ],
  understood: ['知道了', 'Got it'],
  confirmBody: [
    '「{{name}}」尚未被任何支出使用。確認刪除這個分類？原支出仍會保留。',
    '“{{name}}” is not used by any expense. Delete this category? Existing expenses will remain.',
  ],
  verify: ['重新查證', 'Check status'],
  cancel: ['取消', 'Cancel'],
  confirm: ['確認刪除', 'Delete category'],
});

export function DeleteCategory({
  category,
  onClose,
  onDeleted,
}: {
  category: Category;
  onClose: () => void;
  onDeleted: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [error, setError] = useState(''),
    [unconfirmed, setUnconfirmed] = useState(false);
  const writing = useRef(false);

  async function verify() {
    try {
      await apiRequest<Category>(`/api/categories/${category.id}`);
    } catch (failure) {
      return failure instanceof ApiError && failure.status === 404;
    }

    return false;
  }

  const deletion = useMutation({
    mutationFn: async () => {
      try {
        await apiRequest<void>(`/api/categories/${category.id}`, { method: 'DELETE' });
      } catch (failure) {
        if (failure instanceof ApiError && failure.status < 500) throw failure;
        if (await verify()) return;

        setUnconfirmed(true);
        throw new Error(t('deleteCategory.unknown'), { cause: failure });
      }
    },
    onSuccess: onDeleted,
    onError: (failure) => setError(failure.message),
    onSettled: () => {
      writing.current = false;
    },
  });

  const verification = useMutation({
    mutationFn: verify,
    onSuccess: async (confirmed) => {
      if (confirmed) await onDeleted();
      else setError(t('deleteCategory.unknown'));
    },
    onSettled: () => {
      writing.current = false;
    },
  });

  const busy = deletion.isPending || verification.isPending;

  return (
    <FormDialog
      title={t(category.usageCount ? 'deleteCategory.inUseTitle' : 'deleteCategory.deleteTitle')}
      onClose={onClose}
      busy={busy}
    >
      {category.usageCount ? (
        <>
          <p>{t('deleteCategory.inUse', { name: category.name, count: category.usageCount })}</p>
          <p className="muted">{t('deleteCategory.changeFirst')}</p>
          <div className="form-actions">
            <Button variant="default" onClick={onClose}>
              {t('deleteCategory.understood')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p>{t('deleteCategory.confirmBody', { name: category.name })}</p>
          <p className="error" role="alert">
            {error}
          </p>
          {unconfirmed ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                if (!writing.current) {
                  writing.current = true;
                  verification.mutate();
                }
              }}
            >
              {t('deleteCategory.verify')}
            </Button>
          ) : null}
          <div className="form-actions">
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              {t('deleteCategory.cancel')}
            </Button>
            <ActionButton
              busy={busy}
              label={t('deleteCategory.confirm')}
              type="button"
              variant="destructive"
              disabled={busy || unconfirmed}
              onClick={() => {
                if (!writing.current) {
                  writing.current = true;
                  deletion.mutate();
                }
              }}
            />
          </div>
        </>
      )}
    </FormDialog>
  );
}
