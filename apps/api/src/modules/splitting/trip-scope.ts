import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../../db/index.js';
import { trips } from '../../db/schema.js';
import { HttpError, notFound } from '../../http.js';

/** Call only after establishing the owner-scoped trip, preserving foreign/unknown 404s. */
export function assertActiveTrip(trip: { deletedAt: Date | null }): void {
  if (trip.deletedAt !== null) throw new HttpError(409, 'TRIP_TRASHED', '旅行已在垃圾桶。');
}

/** All accounting writers acquire this owner-scoped travel row before child locks or source reads. */
export async function requireOwnedTrip(
  db: Pick<Database, 'select'>,
  ownerId: string,
  tripId: string,
  lock = false,
) {
  const query = db
    .select()
    .from(trips)
    .where(and(eq(trips.ownerId, ownerId), eq(trips.id, tripId)));
  const [trip] = await (lock ? query.for('update') : query);
  if (!trip) throw notFound();
  assertActiveTrip(trip);

  return trip;
}

export async function advanceAccountingRevision(
  db: Pick<Database, 'update'>,
  ownerId: string,
  tripId: string,
) {
  await db
    .update(trips)
    .set({ accountingRevision: sql`${trips.accountingRevision} + 1` })
    .where(and(eq(trips.ownerId, ownerId), eq(trips.id, tripId)));
}
