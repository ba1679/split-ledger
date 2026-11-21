export type AnalysisViewport = 'desktop' | 'mobile';

export type AnalysisVariant =
  'default' | 'sector' | 'details' | 'enter' | 'space' | 'reduced-motion';

export interface AnalysisTestOptions {
  analysisViewport: AnalysisViewport;
  analysisVariant: AnalysisVariant;
}

export const analysisViewports = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const;
