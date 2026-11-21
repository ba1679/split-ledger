/** Page owns read/scope/currency state; cards own chart and persistent details. */
export type AnalysisChartKind = 'personal' | 'group';

/** CategoryInfo owns transient hover or touch/keyboard information and return focus. */
export interface AnalysisSelection {
  chart: AnalysisChartKind;
  categoryId: string | null;
}
