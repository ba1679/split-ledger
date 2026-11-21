// Adapted from shadcn/ui Chart (MIT); provenance and license: chart.LICENSE.txt.
import * as React from 'react';
import {
  ResponsiveContainer,
  Tooltip,
  type TooltipValueType,
  type TooltipContentProps,
} from 'recharts';
import { cn } from '../../lib/utils.js';

export type ChartConfig = Record<string, { label?: React.ReactNode; color?: string }>;

const ChartContext = React.createContext<ChartConfig | null>(null);

export function ChartContainer({
  config,
  children,
  className,
  style,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof ResponsiveContainer>['children'];
}) {
  const colors = Object.fromEntries(
    Object.entries(config).map(([key, item]) => [`--color-${key}`, item.color]),
  );

  return (
    <ChartContext.Provider value={config}>
      <div
        data-slot="chart"
        className={cn('ds-chart', className)}
        style={{ ...colors, ...style } as React.CSSProperties}
        {...props}
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 320, height: 240 }}
        >
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = Tooltip;

export function ChartTooltipContent({
  active,
  payload,
  className,
  formatter,
}: Partial<TooltipContentProps<TooltipValueType, number | string>> & {
  className?: string;
}) {
  const config = React.useContext(ChartContext);
  if (!config) throw new Error('ChartTooltipContent requires ChartContainer');
  if (!active || !payload?.length) return null;

  return (
    <div className={cn('ds-chart-tooltip', className)}>
      {payload
        .filter((item) => item.type !== 'none')
        .map((item, index) => {
          const key = String(item.name ?? item.dataKey ?? 'value');

          return (
            <div className="ds-chart-tooltip-row" key={`${key}-${index}`}>
              <span
                aria-hidden="true"
                className="ds-chart-indicator"
                style={{ background: item.color ?? config[key]?.color }}
              />
              {formatter && item.value !== undefined && item.name !== undefined ? (
                formatter(item.value, item.name, item, index, payload)
              ) : (
                <>
                  <span>{config[key]?.label ?? item.name}</span>
                  <strong>{String(item.value ?? '')}</strong>
                </>
              )}
            </div>
          );
        })}
    </div>
  );
}
