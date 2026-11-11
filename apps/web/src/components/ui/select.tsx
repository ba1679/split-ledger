import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils.js';

/** Native keyboard selection with the same arrow inset as SearchCombo. */
export function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="native-select">
      <select className={cn('ds-input', className)} {...props} />
      <ChevronDown size={20} strokeWidth={1.6} aria-hidden="true" />
    </div>
  );
}
