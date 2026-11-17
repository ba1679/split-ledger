export type QueryWaitPhase = 'idle' | 'initial' | 'section' | 'refresh' | 'pagination' | 'paused';

export type ActionWaitPhase = 'idle' | 'submitting' | 'verifying' | 'unknown' | 'paused';

// Accessible labels are separate from visible text: the approved busy design is spinner-only.
export interface BusyIndicatorProps {
  accessibleLabel: string;
  className?: string;
}

export interface SkeletonProps {
  layout: 'cards' | 'media' | 'list' | 'form' | 'summary';
  accessibleLabel: string;
  caption?: string;
}

export interface VerifyOutcomeProps {
  phase: ActionWaitPhase;
  accessibleLabel: string;
  message?: string;
  onRecheck?: () => void;
}

export interface PausedNoticeProps {
  message: string;
  onRetry?: () => void;
}
