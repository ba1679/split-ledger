import { Button } from '../../components/ui/button.js';
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, type Category, type ItemList } from '../../api/index.js';
import { useSession } from '../auth/session.js';
import { QueryState } from '../../components/QueryState.js';
import { CategoryForm } from './CategoryForm.js';
import { DeleteCategory } from './DeleteCategory.js';
import { Icon } from '../../components/Icon.js';
import { useTranslation } from 'react-i18next';
import { registerInterfaceMessages } from '../../i18n/runtime.js';

registerInterfaceMessages('categoriesPage', {
  eyebrow: ['A PLACE FOR EVERY EXPENSE', 'A PLACE FOR EVERY EXPENSE'],
  title: ['照你的方式，整理花費。', 'Organize spending your way.'],
  intro: ['建立自己的分類，在每一趟旅行中使用。', 'Create your own categories for every trip.'],
  add: ['新增分類', 'Add category'],
  list: ['分類清單', 'Categories'],
  usage: ['已用於 {{count}} 筆支出', 'Used in {{count}} expenses'],
  unused: ['尚未使用', 'Not used yet'],
  rename: ['改名', 'Rename'],
  delete: ['刪除', 'Delete'],
  renameFor: ['改名：{{name}}', 'Rename: {{name}}'],
  deleteFor: ['刪除：{{name}}', 'Delete: {{name}}'],
  emptyTitle: ['整理花費，從你的分類開始。', 'Start organizing spending with categories.'],
  emptyBody: ['所有旅行共用自己的分類。', 'Your categories are shared across all trips.'],
  note: [
    '使用中的分類可以改名；需先解除支出關聯，才能刪除。',
    'You can rename categories in use. Remove expense links before deleting them.',
  ],
  created: ['分類已建立', 'Category created'],
  updated: ['分類名稱已更新', 'Category renamed'],
  deleted: ['分類已刪除', 'Category deleted'],
});

export function Categories() {
  const { t } = useTranslation();
  const { account } = useSession();
  const client = useQueryClient();
  const [editing, setEditing] = useState<Category | 'new' | null>(null),
    [deleting, setDeleting] = useState<Category | null>(null),
    [feedback, setFeedback] = useState('');
  const categories = useQuery({
    queryKey: ['account', account!.id, 'categories'],
    queryFn: ({ signal }) => apiRequest<ItemList<Category>>('/api/categories', { signal }),
  });

  async function changed(message: string) {
    await Promise.all(
      ['categories', 'expense', 'expenses', 'expense-analysis'].map((resource) =>
        client.invalidateQueries({ queryKey: ['account', account!.id, resource] }),
      ),
    );
    setEditing(null);
    setDeleting(null);
    setFeedback(message);
  }

  return (
    <>
      <header className="page-head">
        <div>
          <div className="eyebrow">{t('categoriesPage.eyebrow')}</div>
          <h1>{t('categoriesPage.title')}</h1>
          <p className="muted">{t('categoriesPage.intro')}</p>
        </div>
        <Button variant="default" onClick={() => setEditing('new')} disabled={!categories.data}>
          <Icon name="plus" />
          <span>{t('categoriesPage.add')}</span>
        </Button>
      </header>
      {feedback ? (
        <p className="feedback" role="status">
          {t(feedback)}
        </p>
      ) : null}
      {categories.isPending || categories.error ? (
        <QueryState
          label={t('categoriesPage.list')}
          layout="list"
          fetchStatus={categories.fetchStatus}
          pending={categories.isPending}
          error={categories.error}
          retry={() => {
            void categories.refetch();
          }}
        />
      ) : categories.data.items.length ? (
        <div className="ledger" role="region" aria-label={t('categoriesPage.list')}>
          {categories.data.items.map((category) => (
            <div className="category-row" key={category.id}>
              <span className="category-icon">
                <Icon name="list" />
              </span>
              <div className="row-info">
                <span>{category.name}</span>
                <small>
                  {category.usageCount
                    ? t('categoriesPage.usage', { count: category.usageCount })
                    : t('categoriesPage.unused')}
                </small>
              </div>
              <Button
                variant="ghost"
                className="text-btn"
                aria-label={t('categoriesPage.renameFor', { name: category.name })}
                onClick={() => setEditing(category)}
              >
                {t('categoriesPage.rename')}
              </Button>
              <Button
                variant="ghost"
                className="text-btn danger"
                aria-label={t('categoriesPage.deleteFor', { name: category.name })}
                onClick={() => setDeleting(category)}
              >
                {t('categoriesPage.delete')}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <h2>{t('categoriesPage.emptyTitle')}</h2>
          <p>{t('categoriesPage.emptyBody')}</p>
        </div>
      )}
      <p className="intro-note">
        <Icon name="note" />
        <span>{t('categoriesPage.note')}</span>
      </p>
      {editing && categories.data ? (
        <CategoryForm
          category={editing === 'new' ? undefined : editing}
          categories={categories.data.items}
          onClose={() => setEditing(null)}
          onSaved={() =>
            changed(editing === 'new' ? 'categoriesPage.created' : 'categoriesPage.updated')
          }
        />
      ) : null}
      {deleting ? (
        <DeleteCategory
          category={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => changed('categoriesPage.deleted')}
        />
      ) : null}
    </>
  );
}
