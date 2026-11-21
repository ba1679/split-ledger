import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, type Trip } from '../../../api/index.js';
import { getExpenseAnalysis } from '../../../api/expense-analysis.js';
import { useSession } from '../../auth/session.js';
import {
  useLedgerEntryState,
  useUnavailableLedgerCleanup,
} from '../../trips/use-ledger-entry-state.js';
import { TripAccessState } from '../../trips/TripAccessState.js';
import { ChartPie } from 'lucide-react';
import { AnalysisReadState } from './AnalysisReadState.js';
import { Button } from '../../../components/ui/button.js';
import { BusyIndicator } from '../../../components/waiting/BusyIndicator.js';
import { CategorySpendingCard, categoryKey, orderedCategories } from './CategorySpendingCard.js';
import { CategoryInfo, type AnalysisTrigger } from './CategoryInfo.js';
import './analysis.css';

const palette = [
  '#2D6A57',
  '#BC8063',
  '#A58B42',
  '#6C86A0',
  '#8F749B',
  '#B25E5E',
  '#638E89',
  '#A08468',
];

type SelectedCategory = { kind: '個人' | '團體'; id: string; trigger: AnalysisTrigger };

export function TripExpenseAnalysis() {
  const { tripId } = useParams(),
    { account } = useSession(),
    client = useQueryClient();
  useEffect(() => {
    // Revalidate the credential when entering from an old link or another tab's account.
    void client.invalidateQueries({ queryKey: ['session'] });
  }, [client]);
  const [selection, setSelection] = useState<SelectedCategory | null>(null);
  const returningTo = useRef<SelectedCategory | null>(null);
  const pageElement = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const target = returningTo.current;
    if (selection || !target) return;
    returningTo.current = null;
    const restore = () => {
      const svg = target.trigger instanceof SVGElement;
      const selector = `[role="region"][aria-label="${target.kind}花費"] ${svg ? '.recharts-sector' : '.analysis-details button'}[data-category-id="${CSS.escape(target.id)}"]`;
      const current =
        !svg && target.trigger.isConnected
          ? target.trigger
          : pageElement.current?.querySelector<AnalysisTrigger>(selector);
      current?.focus({ preventScroll: true });
    };
    restore();
    // Recharts may replace its path after committing new interaction props.
    const frame = requestAnimationFrame(restore);

    return () => cancelAnimationFrame(frame);
  }, [selection]);
  const heading = useRef<HTMLHeadingElement>(null);
  const authority = useLedgerEntryState(tripId, heading);
  const selectionKey = ['account', account!.id, 'analysis-currency', tripId];
  const [selected, setSelected] = useState(() => client.getQueryData<string>(selectionKey));
  const trip = useQuery({
    queryKey: ['account', account!.id, 'trip', tripId],
    queryFn: ({ signal }) => apiRequest<Trip>(`/api/trips/${tripId}`, { signal }),
    enabled: authority.data?.state === 'active',
  });
  const analysis = useQuery({
    queryKey: ['account', account!.id, 'expense-analysis', tripId],
    queryFn: ({ signal }) => getExpenseAnalysis(tripId!, signal),
    enabled: authority.data?.state === 'active',
  });
  useUnavailableLedgerCleanup(tripId, authority.data);
  const data = analysis.data;
  const currency =
    data?.currencies.find((row) => row.currencyCode === selected) ?? data?.currencies[0];
  useEffect(() => {
    if (authority.data?.state === 'active' && currency && selected !== currency.currencyCode) {
      setSelected(currency.currencyCode);
      client.setQueryData(
        ['account', account!.id, 'analysis-currency', tripId],
        currency.currencyCode,
      );
    }
  }, [client, account, tripId, selected, currency, authority.data?.state]);
  useEffect(() => {
    if (!authority.data || authority.data.state === 'active') return;
    returningTo.current = null;
    setSelection(null);
    setSelected(undefined);
  }, [authority.data]);
  if (authority.isPending || authority.error || authority.data.state !== 'active')
    return <TripAccessState authority={authority} tripId={tripId!} heading={heading} />;
  const selectedChart = currency?.[selection?.kind === '團體' ? 'group' : 'personal'];
  const selectedRow = selectedChart?.categories.find((row) => categoryKey(row) === selection?.id);
  const closeInfo = () => {
    returningTo.current = selection;
    setSelection(null);
  };
  const chooseCurrency = (code: string) => {
    setSelection(null);
    setSelected(code);
    client.setQueryData(selectionKey, code);
  };
  const colors = new Map<string, string>();
  if (currency)
    for (const row of [
      ...orderedCategories(currency.personal.categories),
      ...orderedCategories(currency.group.categories),
    ]) {
      const key = categoryKey(row);
      if (!colors.has(key)) colors.set(key, palette[colors.size % palette.length]!);
    }

  return (
    <div className="analysis-page" ref={pageElement} data-fetch-status={analysis.fetchStatus}>
      <Link className="analysis-back" to={`/trips/${tripId}`}>
        ‹ {trip.data?.name ?? '旅行'}帳本
      </Link>
      <header className="analysis-heading">
        <div className="eyebrow">SPENDING INSIGHTS</div>
        <h1>花費分析</h1>
        <p>每一筆消費，都有它的位置。</p>
      </header>
      {analysis.isPending || !data ? (
        <AnalysisReadState
          label="花費分析"
          layout="summary"
          pending={analysis.isPending}
          error={analysis.error}
          fetchStatus={analysis.fetchStatus}
          retry={() => {
            void analysis.refetch();
          }}
        />
      ) : (
        <>
          {currency ? (
            <>
              <div className="analysis-currency-control">
                <label htmlFor="analysis-currency">統計幣別</label>
                <select
                  id="analysis-currency"
                  value={currency.currencyCode}
                  onChange={(event) => chooseCurrency(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.altKey || event.metaKey || event.ctrlKey) return;
                    const codes = data.currencies.map((row) => row.currencyCode);
                    const current = codes.indexOf(currency.currencyCode);
                    const next =
                      event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? codes.length - 1
                          : event.key === 'ArrowDown'
                            ? Math.min(current + 1, codes.length - 1)
                            : event.key === 'ArrowUp'
                              ? Math.max(0, current - 1)
                              : null;
                    if (next !== null) {
                      event.preventDefault();
                      chooseCurrency(codes[next]!);
                    }
                  }}
                >
                  {data.currencies.map((row) => (
                    <option key={row.currencyCode} value={row.currencyCode}>
                      {row.currencyCode}
                    </option>
                  ))}
                </select>
              </div>
              {analysis.isFetching ? (
                <div className="analysis-update-indicator" aria-busy="true">
                  <BusyIndicator accessibleLabel="正在更新花費分析" />
                </div>
              ) : null}
              {analysis.fetchStatus === 'paused' ? (
                <p className="analysis-update-note" role="status">
                  已離線，恢復連線後再更新。
                </p>
              ) : analysis.error ? (
                <div className="analysis-update-note error" role="alert">
                  <p>更新失敗，暫時顯示上次資料。</p>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      void analysis.refetch();
                    }}
                  >
                    重新更新
                  </Button>
                </div>
              ) : null}
              <div className="analysis-cards">
                <CategorySpendingCard
                  kind="個人"
                  informationOpen={!!selectedRow}
                  onInspect={(row, trigger) =>
                    setSelection({ kind: '個人', id: categoryKey(row), trigger })
                  }
                  chart={currency.personal}
                  currency={currency.currencyCode}
                  colors={colors}
                />
                {data.hasSharedExpenses ? (
                  <CategorySpendingCard
                    kind="團體"
                    informationOpen={!!selectedRow}
                    onInspect={(row, trigger) =>
                      setSelection({ kind: '團體', id: categoryKey(row), trigger })
                    }
                    chart={currency.group}
                    currency={currency.currencyCode}
                    colors={colors}
                  />
                ) : (
                  <div className="analysis-no-shared">這趟旅行目前沒有共同消費。</div>
                )}
              </div>
              <p className="analysis-hint">將滑鼠移至圖表，或選取分類查看金額與占比。</p>
            </>
          ) : (
            <section className="analysis-empty analysis-message">
              <ChartPie size={32} aria-hidden="true" />
              <h2>還沒有花費可以分析</h2>
              <p>記下第一筆支出，分類分布就會出現在這裡。</p>
              <Button asChild variant="default">
                <Link to={`/trips/${tripId}`}>記一筆</Link>
              </Button>
            </section>
          )}
        </>
      )}
      {selectedRow && selectedChart && currency && selection ? (
        <CategoryInfo
          row={selectedRow}
          chart={selectedChart}
          currency={currency.currencyCode}
          kind={selection.kind}
          onClose={closeInfo}
        />
      ) : null}
    </div>
  );
}
