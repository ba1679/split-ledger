import React from 'react';
import { LoaderCircle } from 'lucide-react';
import type { BusyIndicatorProps } from './types.js';

export function BusyIndicator({ accessibleLabel, className = '' }: BusyIndicatorProps) {
  return (
    <span className={`wait-indicator ${className}`} role="status" aria-label={accessibleLabel}>
      <LoaderCircle className="action-spinner" size={20} aria-hidden="true" />
    </span>
  );
}
