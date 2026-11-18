import { Button } from '../../components/ui/button.js';
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, type Category, type ItemList } from '../../api/index.js';
import { useSession } from '../auth/session.js';
import { QueryState } from '../../components/QueryState.js';
import { CategoryForm } from './CategoryForm.js';
import { DeleteCategory } from './DeleteCategory.js';
import { Icon } from '../../components/Icon.js';

export function Categories() {
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
      ['categories', 'expense', 'expenses'].map((resource) =>
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
          <div className="eyebrow">A PLACE FOR EVERY EXPENSE</div>
          <h1>照你的方式，整理花費。</h1>
          <p className="muted">建立自己的分類，在每一趟旅行中使用。</p>
        </div>
        <Button variant="default" onClick={() => setEditing('new')} disabled={!categories.data}>
          <Icon name="plus" />
          <span>新增分類</span>
        </Button>
      </header>
      {feedback ? (
        <p className="feedback" role="status">
          {feedback}
        </p>
      ) : null}
      {categories.isPending || categories.error ? (
        <QueryState
          label="分類清單"
          layout="list"
          fetchStatus={categories.fetchStatus}
          pending={categories.isPending}
          error={categories.error}
          retry={() => {
            void categories.refetch();
          }}
        />
      ) : categories.data.items.length ? (
        <div className="ledger" role="region" aria-label="分類清單">
          {categories.data.items.map((category) => (
            <div className="category-row" key={category.id}>
              <span className="category-icon">
                <Icon name="list" />
              </span>
              <div className="row-info">
                <span>{category.name}</span>
                <small>
                  {category.usageCount ? `已用於 ${category.usageCount} 筆支出` : '尚未使用'}
                </small>
              </div>
              <Button
                variant="ghost"
                className="text-btn"
                aria-label={`改名：${category.name}`}
                onClick={() => setEditing(category)}
              >
                改名
              </Button>
              <Button
                variant="ghost"
                className="text-btn danger"
                aria-label={`刪除：${category.name}`}
                onClick={() => setDeleting(category)}
              >
                刪除
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <h2>整理花費，從你的分類開始。</h2>
          <p>所有旅行共用自己的分類。</p>
        </div>
      )}
      <p className="intro-note">
        <Icon name="note" />
        <span>使用中的分類可以改名；需先解除支出關聯，才能刪除。</span>
      </p>
      {editing && categories.data ? (
        <CategoryForm
          category={editing === 'new' ? undefined : editing}
          categories={categories.data.items}
          onClose={() => setEditing(null)}
          onSaved={() => changed(editing === 'new' ? '分類已建立' : '分類名稱已更新')}
        />
      ) : null}
      {deleting ? (
        <DeleteCategory
          category={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => changed('分類已刪除')}
        />
      ) : null}
    </>
  );
}
