import React, { useRef } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '../../components/ui/button.js';
import { FormDialog } from '../../components/FormDialog.js';
import { TripOperationCheck } from './TripOperationCheck.js';
import { useLifecycleCommand, type ManagedTrip, type OperationOutcome } from './management-api.js';

const confirmationCopy = {
  trash: {
    label: '移至垃圾桶',
    busyLabel: '正在移至垃圾桶',
    className: 'trash-confirmation',
    variant: 'default',
    description: (
      <>
        <p>旅行會先從我的旅行清單移除，保留完整帳務與照片。之後可以從垃圾桶復原。</p>
        <p className="trip-command-note">移入垃圾桶不會結清欠款或更改帳務。</p>
      </>
    ),
  },
  purge: {
    label: '永久刪除',
    busyLabel: '正在永久刪除旅行',
    className: 'purge-confirmation',
    variant: 'destructive',
    description: (
      <>
        <p>
          <span className="desktop-confirm-copy">
            這會永久刪除整趟旅行、同行者、支出、還款、結清紀錄及自訂縮圖，無法復原。
          </span>
          <span className="mobile-confirm-copy">
            整趟旅行的同行者、支出、還款、結清與縮圖將永久刪除，無法復原。
          </span>
        </p>
        <p className="trip-command-note purge-warning">永久刪除後，不能再開啟這趟旅行。</p>
      </>
    ),
  },
} as const;

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
  const cancel = useRef<HTMLButtonElement>(null);
  const command = useLifecycleCommand(trip, operation, onComplete, onUnknownChange, onRejected);
  const purge = operation === 'purge';
  const copy = confirmationCopy[operation];
  const outcome = command.unknown ? (
    <section className="operation-outcome" role="status">
      <p>「{trip.name}」操作結果尚未確認，請查證原次操作。</p>
      <TripOperationCheck
        busy={command.isPending}
        onCheck={command.verify}
        busyLabel="正在查證旅行操作"
      />
    </section>
  ) : null;
  if (!open) return outcome;

  return (
    <FormDialog
      title={
        purge ? (
          <>
            <span>永久刪除</span>
            <br className="mobile-confirm-break" />
            <span>「{trip.name}」？</span>
          </>
        ) : (
          <>
            <span>將「{trip.name}」</span>
            <br className="mobile-confirm-break" />
            <span>移至垃圾桶？</span>
          </>
        )
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
          {command.unknown ? '關閉視窗' : '取消'}
        </Button>
        <Button
          variant={copy.variant}
          disabled={command.isPending || command.unknown}
          aria-busy={command.isPending}
          aria-label={command.isPending ? copy.busyLabel : undefined}
          onClick={() => {
            if (!command.isPending && !command.unknown) {
              onSubmit?.();
              command.submit();
            }
          }}
        >
          {command.isPending ? (
            <LoaderCircle size={20} className="action-spinner" aria-hidden="true" />
          ) : (
            copy.label
          )}
        </Button>
      </div>
      <p className="dialog-escape">
        {command.isPending ? (
          '操作已送出，請等待查證結果；關閉不會撤回操作。'
        ) : command.unknown ? (
          '關閉只會收起視窗，原次操作仍須查證。'
        ) : (
          <>
            <span className="desktop-dialog-hint">按 Esc 也可取消</span>
            <span className="mobile-dialog-hint">取消或關閉不會更改旅行</span>
          </>
        )}
      </p>
    </FormDialog>
  );
}

export { ThumbnailEntryDialog } from './ThumbnailEditor.js';
