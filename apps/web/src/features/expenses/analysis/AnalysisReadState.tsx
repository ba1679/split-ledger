import React from 'react';
import { useTranslation } from 'react-i18next';
import { QueryState } from '../../../components/QueryState.js';
import { Button } from '../../../components/ui/button.js';
import '../messages.js';

export function AnalysisReadState(props: React.ComponentProps<typeof QueryState>) {
  const { t, i18n } = useTranslation();
  if (props.pending || props.fetchStatus === 'paused')
    return (
      <div className="analysis-initial">
        <QueryState
          {...props}
          pendingMessage={
            props.pending && i18n.language === 'en'
              ? t('expenses.analysisLoading')
              : props.pendingMessage
          }
        />
      </div>
    );

  return (
    <section className="analysis-message" role="alert">
      <h2>{t('expenses.analysisLoadFailed')}</h2>
      <p>{t('expenses.analysisReadFailed')}</p>
      <Button variant="outline" onClick={props.retry}>
        {t('expenses.analysisRetry')}
      </Button>
    </section>
  );
}
