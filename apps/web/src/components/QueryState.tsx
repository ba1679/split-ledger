import { useTranslation } from 'react-i18next';
import '../i18n/shared-messages.js';
import { Button } from '../components/ui/button.js';
import React from 'react';
import { ApiError, apiErrorMessage } from '../api/index.js';
import { Skeleton } from './waiting/Skeleton.js';
import type { SkeletonProps } from './waiting/types.js';

export function QueryState({
  pending,
  error,
  retry,
  label: queryLabel,
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
  const { t } = useTranslation();
  const label = queryLabel ?? t('common.content');
  if (fetchStatus === 'paused')
    return (
      <section className="state" aria-label={label}>
        <p role="status">{t('common.waitingConnection')}</p>
        <p>{t('common.reconnect')}</p>
      </section>
    );
  if (pending)
    return (
      <section aria-label={label} aria-busy="true">
        <Skeleton
          layout={layout}
          accessibleLabel={t('common.loading', { label })}
          caption={pendingMessage}
        />
      </section>
    );

  const message = error instanceof ApiError ? apiErrorMessage(error) : t('common.readFailure');

  return (
    <section aria-label={label}>
      <div className="state" role="alert">
        <h2>{t('common.unavailable')}</h2>
        <p>{message}</p>
        <Button variant="default" onClick={retry}>
          {t('common.reload')}
        </Button>
      </div>
    </section>
  );
}
