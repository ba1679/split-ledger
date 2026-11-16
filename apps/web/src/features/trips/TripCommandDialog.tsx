import React, { useRef } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '../../components/ui/button.js';
import { FormDialog } from '../../components/FormDialog.js';
import { useLifecycleCommand, type ManagedTrip, type OperationOutcome } from './management-api.js';

export function TripCommandDialog({
  trip,
  operation,
  onClose,
  onComplete,
}: {
  trip: ManagedTrip;
  operation: 'trash' | 'purge';
  onClose: () => void;
  onComplete: (result: OperationOutcome) => void;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  const command = useLifecycleCommand(trip, operation, onComplete);
  const purge = operation === 'purge';

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
      className={`trip-command-dialog ${purge ? 'purge-confirmation' : 'trash-confirmation'}`}
      description={
        purge ? (
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
        ) : (
          <>
            <p>旅行會先從我的旅行清單移除，保留完整帳務與照片。之後可以從垃圾桶復原。</p>
            <p className="trip-command-note">移入垃圾桶不會結清欠款或更改帳務。</p>
          </>
        )
      }
    >
      {command.error ? (
        <p role="alert" className="error">
          {command.error.message}
        </p>
      ) : null}
      <div className="form-actions trip-command-actions">
        <Button ref={cancel} variant="outline" disabled={command.isPending} onClick={onClose}>
          取消
        </Button>
        <Button
          variant={purge ? 'destructive' : 'default'}
          disabled={command.isPending}
          aria-busy={command.isPending}
          aria-label={
            command.isPending ? (purge ? '正在永久刪除旅行' : '正在移至垃圾桶') : undefined
          }
          onClick={command.submit}
        >
          {command.isPending ? (
            <LoaderCircle size={20} className="action-spinner" aria-hidden="true" />
          ) : purge ? (
            '永久刪除'
          ) : (
            '移至垃圾桶'
          )}
        </Button>
      </div>
      <p className="dialog-escape">
        <span className="desktop-dialog-hint">按 Esc 也可取消</span>
        <span className="mobile-dialog-hint">取消或關閉不會更改旅行</span>
      </p>
    </FormDialog>
  );
}

export { ThumbnailEntryDialog } from './ThumbnailEditor.js';
