import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { AnalysisCategory, AnalysisChart } from '../../../api/expense-analysis.js';
import { ChartTooltipContent } from '../../../components/ui/chart.js';
import { formatShareAmount } from '../ExpenseShares.js';
import { displayAmount } from '../money.js';
import { formatAnalysisPercent } from './math.js';

/** Recharts owns activation and chart positioning; keep its branded content in view. */
export function AnalysisTooltip({
  tooltip,
  chart,
  currency,
  kind,
}: {
  tooltip: React.ComponentProps<typeof ChartTooltipContent>;
  chart: AnalysisChart;
  currency: string;
  kind: '個人' | '團體';
}) {
  const element = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const reposition = useCallback(() => {
    const box = element.current?.getBoundingClientRect();
    if (!box) return;
    const navigation = document.querySelector('.bottom-nav');
    const bottom =
      navigation && getComputedStyle(navigation).display !== 'none'
        ? Math.min(innerHeight - 12, navigation.getBoundingClientRect().top - 12)
        : innerHeight - 12;
    const left = box.left - offset.x,
      top = box.top - offset.y;
    const x = Math.max(12 - left, Math.min(0, innerWidth - 12 - left - box.width));
    const y = Math.max(12 - top, Math.min(0, bottom - top - box.height));
    if (Math.abs(x - offset.x) > 0.5 || Math.abs(y - offset.y) > 0.5) setOffset({ x, y });
  }, [offset.x, offset.y]);
  useLayoutEffect(reposition);
  useEffect(() => {
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);

    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [reposition]);

  return (
    <div
      ref={element}
      role="tooltip"
      aria-label="分類資訊"
      className="analysis-tooltip"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      <ChartTooltipContent
        {...tooltip}
        formatter={(_value, _name, item) => {
          const source = (item.payload as { row: AnalysisCategory }).row;

          return (
            <>
              <strong className="analysis-info-name">{source.category?.name ?? '未分類'}</strong>
              <span className="analysis-info-amount">
                {currency} {displayAmount(formatShareAmount(source.amount))}
              </span>
              <small>
                占{kind}花費 {formatAnalysisPercent(source.amount, chart.total)}
              </small>
            </>
          );
        }}
      />
    </div>
  );
}
