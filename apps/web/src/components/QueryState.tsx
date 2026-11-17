import { Button } from '../components/ui/button.js';
import React from 'react';
import { ApiError } from '../api/index.js';
import { Skeleton } from './waiting/Skeleton.js';
import type { SkeletonProps } from './waiting/types.js';

export function QueryState({
  pending,
  error,
  retry,
  label = '內容',
  layout = 'summary',
  fetchStatus,
  pendingMessage,
}: {
  pending?: boolean;
  error?: Error | null;
  retry?: () => void;
  label?: string;
  layout?: SkeletonProps['layout'];
  fetchStatus?: 'fetching' | 'paused' | 'idle';
  pendingMessage?: string;
}) {
  if (fetchStatus === 'paused')
    return (
      <section className="state" aria-label={label}>
        <p role="status">等待網路連線</p>
        <p>恢復連線後會接續讀取，已保存的資料不會改變。</p>
      </section>
    );
  if (pending)
    return (
      <section aria-label={label} aria-busy="true">
        <Skeleton layout={layout} accessibleLabel={`正在讀取${label}`} caption={pendingMessage} />
      </section>
    );

  const message =
    error instanceof ApiError
      ? error.message
      : '請檢查連線後重新嘗試，你已保存的資料不會因此改變。';

  return (
    <section aria-label={label}>
      <div className="state" role="alert">
        <h2>暫時無法取得帳本</h2>
        <p>{message}</p>
        <Button variant="default" onClick={retry}>
          重新嘗試
        </Button>
      </div>
    </section>
  );
}
