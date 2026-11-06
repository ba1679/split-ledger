// Based on shadcn/ui's new-york Button registry component, adapted to journey tokens.
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';

const buttonVariants = cva('ds-button', {
  variants: {
    variant: {
      default: 'ds-button-default',
      destructive: 'ds-button-destructive',
      outline: 'ds-button-outline',
      secondary: 'ds-button-secondary',
      ghost: 'ds-button-ghost',
      link: 'ds-button-link',
    },
    size: {
      default: 'ds-button-size-default',
      sm: 'ds-button-size-sm',
      lg: 'ds-button-size-lg',
      icon: 'ds-button-size-icon',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
