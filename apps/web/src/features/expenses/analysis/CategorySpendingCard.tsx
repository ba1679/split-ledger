import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pie, PieChart, Sector, type PieSectorShapeProps } from 'recharts';
import type { AnalysisCategory, AnalysisChart } from '../../../api/expense-analysis.js';
import { ChartContainer, ChartTooltip } from '../../../components/ui/chart.js';
import { formatShareAmount } from '../ExpenseShares.js';
import { displayAmount } from '../money.js';
import { chartWeights, formatAnalysisPercent } from './math.js';
import type { AnalysisTrigger } from './CategoryInfo.js';
import { AnalysisTooltip } from './AnalysisTooltip.js';
import '../messages.js';

export const categoryKey = (row: AnalysisCategory) => row.category?.id ?? 'unclassified';

export function orderedCategories(rows: AnalysisCategory[]) {
  return [...rows].sort((a, b) => {
    const difference =
      BigInt(b.amount.numerator) * BigInt(a.amount.denominator) -
      BigInt(a.amount.numerator) * BigInt(b.amount.denominator);

    return difference > 0n
      ? 1
      : difference < 0n
        ? -1
        : (a.category?.name ?? '未分類').localeCompare(
            b.category?.name ?? '未分類',
            'zh-Hant-u-co-stroke',
          );
  });
}

export function CategorySpendingCard({
  kind,
  chart,
  currency,
  colors,
  informationOpen,
  onInspect,
}: {
  kind: '個人' | '團體';
  chart: AnalysisChart;
  currency: string;
  colors: Map<string, string>;
  informationOpen: boolean;
  onInspect: (row: AnalysisCategory, trigger: AnalysisTrigger) => void;
}) {
  const { t } = useTranslation();
  const personal = kind === '個人';
  const title = t(personal ? 'expenses.personalTitle' : 'expenses.groupTitle');
  const totalLabel = t(personal ? 'expenses.personalTotal' : 'expenses.groupTotal');
  const [tooltipPosition, setTooltipPosition] = React.useState<{ x: number; y: number }>();
  const totalText = displayAmount(formatShareAmount(chart.total));
  const rows = orderedCategories(chart.categories);
  const weights = chartWeights(rows.map((row) => row.amount));
  const data = rows.map((row, i) => ({
    id: categoryKey(row),
    value: weights[i],
    fill: colors.get(categoryKey(row)),
    row,
  }));

  return (
    <section className="analysis-card" role="region" aria-label={title}>
      <h2>{title}</h2>
      <p className="analysis-card-description">
        {t(personal ? 'expenses.personalDescription' : 'expenses.groupDescription')}
      </p>
      {rows.length ? (
        <div className="analysis-ring">
          <ChartContainer config={{}} className="analysis-chart" aria-label={t(personal ? 'expenses.personalChart' : 'expenses.groupChart')}>
            <PieChart accessibilityLayer={false}>
              <Pie
                data={data}
                dataKey="value"
                nameKey="id"
                cx="50%"
                cy="50%"
                innerRadius={73}
                outerRadius={98}
                startAngle={90}
                endAngle={450}
                paddingAngle={0}
                stroke="#fff"
                strokeWidth={1}
                isAnimationActive={false}
                shape={(props: PieSectorShapeProps) => (
                  <Sector
                    {...props}
                    tabIndex={-1}
                    role="button"
                    aria-label={rows[props.index]?.category?.name ?? t('expenses.uncategorized')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onInspect(rows[props.index]!, event.currentTarget);
                      }
                    }}
                    data-category-id={data[props.index]?.id}
                    onPointerMove={(event) => {
                      if (event.pointerType !== 'mouse') return;
                      const box = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                      if (!box) return;
                      const next = {
                        x: Math.max(0, Math.min(box.width - 200, box.width / 2 + 45)),
                        y: Math.max(0, box.height / 2 - 57),
                      };
                      setTooltipPosition((current) =>
                        current?.x === next.x && current?.y === next.y ? current : next,
                      );
                    }}
                    onClick={(event) => onInspect(rows[props.index]!, event.currentTarget)}
                  />
                )}
              />
              <ChartTooltip
                position={tooltipPosition}
                active={informationOpen ? false : undefined}
                cursor={false}
                isAnimationActive={false}
                content={(props) =>
                  props.active ? (
                    <AnalysisTooltip
                      tooltip={props}
                      chart={chart}
                      currency={currency}
                      kind={kind}
                    />
                  ) : null
                }
              />
            </PieChart>
          </ChartContainer>
          <div
            className={`analysis-total${totalText.length > 16 ? ' analysis-total-longer' : totalText.length > 12 ? ' analysis-total-long' : ''}`}
          >
            <output aria-label={totalLabel}>{totalText}</output>
            <span className="analysis-total-currency">{currency}</span>
          </div>
        </div>
      ) : (
        <div className="analysis-total analysis-zero-total">
          <span className="analysis-total-currency">{currency}</span>
          <output aria-label={totalLabel}>{totalText}</output>
        </div>
      )}
      {rows.length ? (
        <div className="analysis-details">
          <div className="analysis-details-heading">
            <span>{t('expenses.category')}</span>
            <span>{t('expenses.analysisAmountShare')}</span>
          </div>
          {rows.map((row) => {
            const name = row.category?.name ?? t('expenses.uncategorized'),
              amount = displayAmount(formatShareAmount(row.amount)),
              percent = formatAnalysisPercent(row.amount, chart.total);

            return (
              <button
                key={categoryKey(row)}
                className="analysis-category"
                data-category-id={categoryKey(row)}
                aria-label={`${name} ${currency} ${amount} ${percent}`}
                onClick={(event) => onInspect(row, event.currentTarget)}
              >
                <span
                  className="analysis-category-indicator"
                  style={{ backgroundColor: colors.get(categoryKey(row)) }}
                />
                <span className="analysis-category-name">{name}</span>
                <span className="analysis-category-amount">{amount}</span>
                <span className="analysis-category-percent">{percent}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <p className="analysis-zero-description">
            {t(personal ? 'expenses.personalNoSpending' : 'expenses.groupNoSpending')}
          </p>
          <p className="analysis-zero-hint">{t('expenses.analysisSwitchCurrency')}</p>
        </>
      )}
    </section>
  );
}
