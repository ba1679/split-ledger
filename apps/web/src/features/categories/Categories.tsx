import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, type Category, type ItemList } from '../../api/index.js';
import { useSession } from '../auth/session.js';
import { QueryState } from '../../components/QueryState.js';

export function Categories() {
  const { account } = useSession();
  const categories = useQuery({ queryKey: ['account', account!.id, 'categories'], queryFn: ({ signal }) => apiRequest<ItemList<Category>>('/api/categories', { signal }) });
  return <>
    <header className="page-head"><div><div className="eyebrow">A PLACE FOR EVERY EXPENSE</div><h1>照你的方式，整理花費。</h1><p className="muted">建立自己的分類，在每一趟旅行中使用。</p></div></header>
    {categories.isPending || categories.error ? <QueryState pending={categories.isPending} error={categories.error} retry={() => { void categories.refetch(); }} /> :
      categories.data.items.length ? <div className="ledger">{categories.data.items.map(category => <div className="category-row" key={category.id}><div className="row-info"><span>{category.name}</span><small>{category.usageCount ? `已用於 ${category.usageCount} 筆支出` : '尚未使用'}</small></div></div>)}</div> : <div className="empty"><h2>整理花費，從你的分類開始。</h2><p>所有旅行共用自己的分類。</p></div>}
    <p className="intro-note">使用中的分類可以改名；需先解除支出關聯，才能刪除。</p>
  </>;
}
