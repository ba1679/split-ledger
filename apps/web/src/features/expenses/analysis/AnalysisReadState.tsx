import React from 'react';
import { QueryState } from '../../../components/QueryState.js';
import { Button } from '../../../components/ui/button.js';

export function AnalysisReadState(props: React.ComponentProps<typeof QueryState>) {
  if (props.pending || props.fetchStatus === 'paused')
    return (
      <div className="analysis-initial">
        <QueryState {...props} />
      </div>
    );

  return (
    <section className="analysis-message" role="alert">
      <h2>暫時無法載入分析</h2>
      <p>無法取得資料，請稍後重試。</p>
      <Button variant="outline" onClick={props.retry}>
        重新載入
      </Button>
    </section>
  );
}
