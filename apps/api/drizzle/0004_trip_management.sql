ALTER TABLE trips
  ADD COLUMN deleted_at timestamptz,
  ADD COLUMN lifecycle_revision bigint NOT NULL DEFAULT 0 CHECK (lifecycle_revision >= 0),
  ADD COLUMN thumbnail_revision bigint NOT NULL DEFAULT 0 CHECK (thumbnail_revision >= 0);
CREATE INDEX trips_owner_deleted_created_id_idx ON trips(owner_id,deleted_at,created_at DESC,id DESC);

CREATE TABLE trip_id_reservations (
  trip_id uuid PRIMARY KEY,
  owner_id text NOT NULL REFERENCES auth."user"(id) ON DELETE RESTRICT,
  reserved_at timestamptz NOT NULL DEFAULT now(),
  purged_at timestamptz,
  CONSTRAINT trip_id_reservations_owner_trip_uq UNIQUE(owner_id,trip_id)
);
INSERT INTO trip_id_reservations(trip_id,owner_id,reserved_at)
  SELECT id,owner_id,created_at FROM trips;

CREATE FUNCTION app_reserve_trip_id() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO trip_id_reservations(trip_id,owner_id,reserved_at)
    VALUES(NEW.id,NEW.owner_id,NEW.created_at);
  RETURN NEW;
END;
$$;
CREATE TRIGGER trips_reserve_id BEFORE INSERT ON trips
  FOR EACH ROW EXECUTE FUNCTION app_reserve_trip_id();

CREATE FUNCTION app_protect_trip_reservation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'Trip identifiers cannot be released' USING ERRCODE='23514';
  END IF;
  IF NEW.trip_id IS DISTINCT FROM OLD.trip_id
     OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.reserved_at IS DISTINCT FROM OLD.reserved_at
     OR OLD.purged_at IS NOT NULL OR NEW.purged_at IS NULL
     OR current_setting('app.purge_owner_id',true) IS DISTINCT FROM OLD.owner_id
     OR current_setting('app.purge_trip_id',true) IS DISTINCT FROM OLD.trip_id::text
     OR EXISTS(SELECT 1 FROM trips WHERE id=OLD.trip_id) THEN
    RAISE EXCEPTION 'Trip reservation is immutable outside its one-time purge' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trip_id_reservations_immutable BEFORE UPDATE OR DELETE ON trip_id_reservations
  FOR EACH ROW EXECUTE FUNCTION app_protect_trip_reservation();

CREATE TYPE trip_operation_kind AS ENUM('move_to_trash','restore','purge','save_thumbnail','reset_thumbnail');
CREATE TYPE trip_operation_result_state AS ENUM('active','trash','purged');
CREATE TABLE trip_operation_receipts (
  owner_id text NOT NULL REFERENCES auth."user"(id) ON DELETE RESTRICT,
  operation_id uuid NOT NULL,
  trip_id uuid NOT NULL,
  kind trip_operation_kind NOT NULL,
  request_fingerprint bytea NOT NULL CHECK(octet_length(request_fingerprint)=32),
  result_state trip_operation_result_state NOT NULL,
  result_lifecycle_revision bigint NOT NULL CHECK(result_lifecycle_revision>=0),
  result_thumbnail_revision bigint NOT NULL CHECK(result_thumbnail_revision>=0),
  result_thumbnail_present boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_operation_receipts_pk PRIMARY KEY(owner_id,operation_id),
  CONSTRAINT trip_operation_receipts_result_shape CHECK(
    (kind='move_to_trash' AND result_state='trash' AND result_thumbnail_present IS NULL)
    OR (kind='restore' AND result_state='active' AND result_thumbnail_present IS NULL)
    OR (kind='purge' AND result_state='purged' AND result_thumbnail_present IS NULL)
    OR (kind='save_thumbnail' AND result_state='active' AND result_thumbnail_present IS TRUE)
    OR (kind='reset_thumbnail' AND result_state='active' AND result_thumbnail_present IS FALSE)
  )
);
CREATE INDEX trip_operation_receipts_owner_trip_created_idx
  ON trip_operation_receipts(owner_id,trip_id,created_at,operation_id);
CREATE FUNCTION app_immutable_trip_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Committed trip operation receipts are immutable' USING ERRCODE='23514';
END;
$$;
CREATE TRIGGER trip_operation_receipts_immutable BEFORE UPDATE OR DELETE ON trip_operation_receipts
  FOR EACH ROW EXECUTE FUNCTION app_immutable_trip_receipt();

CREATE TABLE trip_thumbnails (
  owner_id text NOT NULL,
  trip_id uuid NOT NULL,
  image_webp bytea NOT NULL CHECK(octet_length(image_webp) BETWEEN 1 AND 524288),
  width integer NOT NULL CHECK(width BETWEEN 1 AND 1200),
  height integer NOT NULL CHECK(height BETWEEN 1 AND 1200),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_thumbnails_pk PRIMARY KEY(owner_id,trip_id),
  CONSTRAINT trip_thumbnails_owner_trip_fk FOREIGN KEY(owner_id,trip_id)
    REFERENCES trips(owner_id,id) ON DELETE RESTRICT
);
