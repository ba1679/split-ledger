// Based on shadcn/ui's new-york Input registry component, adapted to journey tokens.
import * as React from 'react';
import { cn } from '../../lib/utils.js';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input type={type} className={cn('ds-input', className)} ref={ref} {...props} />
  ),
);
Input.displayName = 'Input';

export { Input };
