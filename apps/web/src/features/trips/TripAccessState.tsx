import React, { type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { QueryState } from '../../components/QueryState.js';
import { Icon } from '../../components/Icon.js';
import { useSession } from '../auth/session.js';
import { expenseDraftKey, type RetainedExpenseDraft } from '../expenses/expense-draft.js';
import type { TripState } from './management-api.js';

export function TripAccessState({
  authority,
  heading,
  tripId,
}: {
  authority: UseQueryResult<TripState>;
  heading: RefObject<HTMLHeadingElement | null>;
  tripId: string;
}) {
  const { account } = useSession();
  const client = useQueryClient();
  const draft = client.getQueryData<RetainedExpenseDraft>(expenseDraftKey(account!.id, tripId));
  if (authority.isPending || authority.error)
    return (
      <>
        {authority.error ? (
          <Link className="back" to="/trips">
            <Icon name="back" />
            <span>我的旅行</span>
          </Link>
        ) : null}
        <QueryState
          label="旅行資料"
          fetchStatus={authority.fetchStatus}
          pending={authority.isPending}
          error={authority.error}
          retry={() => {
            void authority.refetch();
          }}
        />
      </>
    );
  const state = authority.data.state;

  return (
    <section className="state">
      <h1 ref={heading} tabIndex={-1}>
        {state === 'trash' ? '旅行已在垃圾桶' : '找不到這趟旅行'}
      </h1>
      <p>
        {state === 'trash' ? '請先從垃圾桶復原，再繼續記帳。' : '旅行已永久刪除，無法再開啟帳本。'}
      </p>
      <Link to={state === 'trash' ? '/trips/trash' : '/trips'}>
        {state === 'trash' ? '前往垃圾桶復原' : '返回旅行清單'}
      </Link>
      {draft ? (
        <section aria-label="尚未保存的支出草稿">
          <h2>尚未保存的支出草稿</h2>
          <p>{draft.item}</p>
          <p>
            {draft.amount} {draft.currencyCode}
          </p>
          <p>{draft.spentOn}</p>
        </section>
      ) : null}
    </section>
  );
}
