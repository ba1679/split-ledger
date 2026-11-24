import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { AnalysisCategory, AnalysisChart } from '../../../api/expense-analysis.js';
import { Button } from '../../../components/ui/button.js';
import { formatShareAmount } from '../ExpenseShares.js';
import { displayAmount } from '../money.js';
import { formatAnalysisPercent } from './math.js';
import '../messages.js';

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
  const { t } = useTranslation();
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
    <section role="dialog" aria-label={t('expenses.categoryInfo')} className="analysis-info-card">
      <header>
        <strong className="analysis-info-name">{row.category?.name ?? t('expenses.uncategorized')}</strong>
        <Button
          ref={close}
          variant="ghost"
          className="analysis-info-close"
          aria-label={t('expenses.closeCategoryInfo')}
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </Button>
      </header>
      <p className="analysis-info-amount">
        {currency} {displayAmount(formatShareAmount(row.amount))}
      </p>
      <p className="analysis-info-percent">
        {t(kind === '個人' ? 'expenses.personalPercent' : 'expenses.groupPercent', { percent: formatAnalysisPercent(row.amount, chart.total) })}
      </p>
    </section>
  );
}
