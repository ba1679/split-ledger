import { tripText, useTripText } from './messages.js';
import React, { useRef } from 'react';
import { ActionButton } from '../../components/waiting/ActionButton.js';
import { Button } from '../../components/ui/button.js';
import { FormDialog } from '../../components/FormDialog.js';
import { TripOperationCheck } from './TripOperationCheck.js';
import { useLifecycleCommand, type ManagedTrip, type OperationOutcome } from './management-api.js';

function confirmationCopy() {
  return {
    trash: {
      label: tripText('moveToTrash'),
      busyLabel: tripText('movingToTrash'),
      className: 'trash-confirmation',
      variant: 'default',
      description: (
        <>
          <p>{tripText('theTripWillLeaveMyTripsWhileIts')}</p>
          <p className="trip-command-note">{tripText('movingToTrashDoesNotSettleDebtsOr')}</p>
        </>
      ),
    },
    purge: {
      label: tripText('permanentlyDelete'),
      busyLabel: tripText('permanentlyDeletingTrip'),
      className: 'purge-confirmation',
      variant: 'destructive',
      description: (
        <>
          <p>
            <span className="desktop-confirm-copy">{tripText('purgeDescriptionDesktop')}</span>
            <span className="mobile-confirm-copy">{tripText('purgeDescriptionMobile')}</span>
          </p>
          <p className="trip-command-note purge-warning">
            {tripText('youWillNoLongerBeAbleToOpen')}
          </p>
        </>
      ),
    },
  } as const;
}

export function TripCommandDialog({
  trip,
  operation,
  onClose,
  onComplete,
  open = true,
  onSubmit,
  onUnknownChange,
  onRejected,
}: {
  trip: ManagedTrip;
  operation: 'trash' | 'purge';
  onClose: () => void;
  onComplete: (result: OperationOutcome, verified?: boolean) => void;
  open?: boolean;
  onSubmit?: () => void;
  onUnknownChange?: (unknown: boolean) => void;
  onRejected?: () => void;
}) {
  useTripText();
  const cancel = useRef<HTMLButtonElement>(null);
  const command = useLifecycleCommand(trip, operation, onComplete, onUnknownChange, onRejected);
  const purge = operation === 'purge';
  const copy = confirmationCopy()[operation];
  const outcome = command.unknown ? (
    <section className="operation-outcome" role="status">
      <p>{tripText('theResultForNameIsUnconfirmedCheckThe', { name: trip.name })}</p>
      <TripOperationCheck
        busy={command.isPending}
        onCheck={command.verify}
        busyLabel={tripText('checkingTripOperation')}
      />
    </section>
  ) : null;
  if (!open) return outcome;

  return (
    <FormDialog
      title={
        purge
          ? tripText('permanentlyDeleteName', { name: trip.name })
          : tripText('moveNameToTrash', { name: trip.name })
      }
      onClose={onClose}
      busy={command.isPending}
      showClose
      initialFocus={cancel}
      className={`trip-command-dialog ${copy.className}`}
      description={copy.description}
    >
      {outcome}
      {!command.unknown && command.error ? (
        <p role="alert" className="error">
          {command.error.message}
        </p>
      ) : null}
      <div className="form-actions trip-command-actions">
        <Button ref={cancel} variant="outline" disabled={command.isPending} onClick={onClose}>
          {command.unknown ? tripText('closeDialog') : tripText('cancel')}
        </Button>
        <ActionButton
          label={copy.label}
          busy={command.isPending}
          busyLabel={copy.busyLabel}
          variant={copy.variant}
          disabled={command.isPending || command.unknown}
          onClick={() => {
            if (!command.isPending && !command.unknown) {
              onSubmit?.();
              command.submit();
            }
          }}
        />
      </div>
      <p className="dialog-escape">
        {command.isPending ? (
          tripText('theOperationWasSentWaitForItsResult')
        ) : command.unknown ? (
          tripText('closingOnlyDismissesThisDialogTheOriginalOperation')
        ) : (
          <>
            <span className="desktop-dialog-hint">{tripText('pressEscToCancel')}</span>
            <span className="mobile-dialog-hint">
              {tripText('cancelingOrClosingWillNotChangeTheTrip')}
            </span>
          </>
        )}
      </p>
    </FormDialog>
  );
}

export { ThumbnailEntryDialog } from './ThumbnailEditor.js';
