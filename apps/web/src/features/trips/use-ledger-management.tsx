import React, { useState, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../auth/session.js';
import { TripCommandDialog, ThumbnailEntryDialog } from './TripCommandDialog.js';
import { lifecycleOutcomeMessage, type ManagedTrip, type TripState } from './management-api.js';

export function useLedgerManagement(
  currentTrip: ManagedTrip | undefined,
  availability: TripState['state'],
  unavailableHeading: RefObject<HTMLHeadingElement | null>,
) {
  const { account } = useSession();
  const navigate = useNavigate();
  const [managementDialog, setManagementDialog] = useState<'thumbnail' | 'trash' | null>(null);
  const [commandTrip, setCommandTrip] = useState<ManagedTrip | null>(null);
  const [thumbnailTrip, setThumbnailTrip] = useState<ManagedTrip | null>(null);

  function closeManagement() {
    setManagementDialog(null);
    requestAnimationFrame(() => {
      if (document.activeElement === document.body)
        unavailableHeading.current?.focus({ preventScroll: true });
    });
  }

  const lifecycleDialog = commandTrip ? (
    <TripCommandDialog
      key={`${account!.id}:${commandTrip.id}`}
      trip={commandTrip}
      operation="trash"
      open={managementDialog === 'trash'}
      onClose={closeManagement}
      onComplete={(result, verified) => {
        setCommandTrip(null);
        setManagementDialog(null);
        navigate('/trips', {
          state: {
            message: verified
              ? lifecycleOutcomeMessage(result)
              : '旅行已移至垃圾桶，可從垃圾桶復原。',
          },
        });
      }}
    />
  ) : null;
  const thumbnailDialog = thumbnailTrip ? (
    <ThumbnailEntryDialog
      key={`${account!.id}:${thumbnailTrip.id}`}
      trip={currentTrip ?? thumbnailTrip}
      open={managementDialog === 'thumbnail'}
      availability={availability}
      onClose={closeManagement}
    />
  ) : null;

  function openManagement(action: 'thumbnail' | 'trash', trip: ManagedTrip) {
    if (action === 'trash') setCommandTrip(trip);
    if (action === 'thumbnail') setThumbnailTrip(trip);
    setManagementDialog(action);
  }

  return { lifecycleDialog, thumbnailDialog, openManagement };
}
