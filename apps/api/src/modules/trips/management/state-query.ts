import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../../../db/index.js';
import { trips, tripIdReservations } from '../../../db/schema.js';
import { notFound } from '../../../http.js';

type Reader = Pick<Database, 'select'>;

export async function readOwnedTripState(db: Reader, ownerId: string, tripId: string) {
  const [row] = await db
    .select({
      deletedAt: trips.deletedAt,
      lifecycleRevision: trips.lifecycleRevision,
      thumbnailRevision: trips.thumbnailRevision,
      hasThumbnail: sql<boolean>`EXISTS(SELECT 1 FROM trip_thumbnails WHERE owner_id=${ownerId} AND trip_id=${tripId}::uuid)`,
    })
    .from(trips)
    .where(and(eq(trips.ownerId, ownerId), eq(trips.id, tripId)));
  if (row)
    return {
      state: row.deletedAt === null ? ('active' as const) : ('trash' as const),
      lifecycleRevision: String(row.lifecycleRevision),
      thumbnailRevision: String(row.thumbnailRevision),
      hasThumbnail: row.hasThumbnail,
    };
  const [reservation] = await db
    .select({ purgedAt: tripIdReservations.purgedAt })
    .from(tripIdReservations)
    .where(and(eq(tripIdReservations.ownerId, ownerId), eq(tripIdReservations.tripId, tripId)));
  if (reservation?.purgedAt)
    return {
      state: 'purged' as const,
      lifecycleRevision: null,
      thumbnailRevision: null,
      hasThumbnail: null,
    };
  throw notFound();
}
