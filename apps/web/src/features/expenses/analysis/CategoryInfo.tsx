import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { AnalysisCategory, AnalysisChart } from '../../../api/expense-analysis.js';
import { Button } from '../../../components/ui/button.js';
import { formatShareAmount } from '../ExpenseShares.js';
import { displayAmount } from '../money.js';
import { formatAnalysisPercent } from './math.js';

export type AnalysisTrigger = HTMLElement | SVGElement;

export function CategoryInfo({
  row,
  chart,
  currency,
  kind,
  onClose,
}: {
  row: AnalysisCategory;
  chart: AnalysisChart;
  currency: string;
  kind: '個人' | '團體';
  onClose: () => void;
}) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', escape);

    return () => window.removeEventListener('keydown', escape);
  }, [onClose]);

  return (
    <section role="dialog" aria-label="分類資訊" className="analysis-info-card">
      <header>
        <strong className="analysis-info-name">{row.category?.name ?? '未分類'}</strong>
        <Button
          ref={close}
          variant="ghost"
          className="analysis-info-close"
          aria-label="關閉分類資訊"
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </Button>
      </header>
      <p className="analysis-info-amount">
        {currency} {displayAmount(formatShareAmount(row.amount))}
      </p>
      <p className="analysis-info-percent">
        占{kind}花費 {formatAnalysisPercent(row.amount, chart.total)}
      </p>
    </section>
  );
}
