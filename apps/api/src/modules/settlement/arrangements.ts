import { createHmac } from 'node:crypto';
import { exactAmount } from '@split-ledger/shared';
import type { SplittingResult } from '@split-ledger/shared';

/** Bind the exact selected edge and ordering to the owner, travel, mode and revision. */
export function settlementArrangements(
  secret: string,
  ownerId: string,
  tripId: string,
  trip: { simplifyDebts: boolean; accountingRevision: bigint },
  calculated: SplittingResult,
) {
  return (
    trip.simplifyDebts ? calculated.simplifiedArrangements : calculated.directArrangements
  ).map((edge, index) => {
    const amount = exactAmount(edge.amount, edge.minorUnit);
    const key = createHmac('sha256', secret)
      .update(
        JSON.stringify([
          ownerId,
          tripId,
          trip.simplifyDebts,
          trip.accountingRevision.toString(),
          index,
          edge.currencyCode,
          edge.fromMemberId,
          edge.toMemberId,
          amount,
        ]),
      )
      .digest('base64url');

    return {
      key,
      debtorMemberId: edge.fromMemberId,
      creditorMemberId: edge.toMemberId,
      currencyCode: edge.currencyCode,
      amount,
    };
  });
}
