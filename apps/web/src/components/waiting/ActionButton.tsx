import { useTranslation } from 'react-i18next';
import '../../i18n/shared-messages.js';
import React, { forwardRef } from 'react';
import { Button, type ButtonProps } from '../ui/button.js';
import { cn } from '../../lib/utils.js';
import { BusyIndicator } from './BusyIndicator.js';

export interface ActionButtonProps extends Omit<ButtonProps, 'asChild' | 'aria-label'> {
  busy: boolean;
  label: string;
  busyLabel?: string;
}

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    { busy, label, busyLabel, disabled, children = label, className, onClick, onKeyDown, ...props },
    ref,
  ) => {
    const { t } = useTranslation();

    return (
      <Button
        {...props}
        ref={ref}
        className={cn('action-button', className)}
        disabled={Boolean(disabled && !busy)}
        aria-label={label}
        aria-busy={busy || undefined}
        aria-disabled={busy || disabled || undefined}
        onClick={(event) => {
          if (busy || disabled) {
            event.preventDefault();
            event.stopPropagation();

            return;
          }
          onClick?.(event);
        }}
        onKeyDown={(event) => {
          if ((busy || disabled) && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            event.stopPropagation();

            return;
          }
          onKeyDown?.(event);
        }}
      >
        <span className="action-button-label">{children}</span>
        {busy ? (
          <BusyIndicator
            className="action-button-spinner"
            accessibleLabel={busyLabel ?? t('common.processing', { label })}
          />
        ) : null}
      </Button>
    );
  },
);
ActionButton.displayName = 'ActionButton';
