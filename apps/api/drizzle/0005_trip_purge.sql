-- Only the matching trash trip in the controlled transaction may remove history.
CREATE FUNCTION app_is_trip_purge(owner_key text, trip_key uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.purge_owner_id',true) = owner_key
     AND current_setting('app.purge_trip_id',true) = trip_key::text
     AND EXISTS(SELECT 1 FROM trips WHERE owner_id=owner_key AND id=trip_key AND deleted_at IS NOT NULL)
$$;

CREATE OR REPLACE FUNCTION app_protect_owner() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' AND app_is_trip_purge(OLD.owner_id,OLD.trip_id) THEN RETURN OLD; END IF;
 IF OLD.role='owner' AND (TG_OP='DELETE' OR NEW IS DISTINCT FROM OLD) THEN
   RAISE EXCEPTION 'Fixed owner member is immutable' USING ERRCODE='23514';
 END IF;
 IF TG_OP='UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
   RAISE EXCEPTION 'Member role is immutable' USING ERRCODE='23514';
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;

CREATE OR REPLACE FUNCTION app_immutable_payment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' AND app_is_trip_purge(OLD.owner_id,OLD.trip_id) THEN RETURN OLD; END IF;
 RAISE EXCEPTION 'Historical payment facts are immutable' USING ERRCODE='23514';
END $$;

CREATE FUNCTION app_purge_trip(owner_key text, trip_key uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE previous_owner text := current_setting('app.purge_owner_id',true);
        previous_trip text := current_setting('app.purge_trip_id',true);
BEGIN
 PERFORM 1 FROM trips WHERE owner_id=owner_key AND id=trip_key AND deleted_at IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Purge requires an owned trash trip' USING ERRCODE='23514'; END IF;
 PERFORM set_config('app.purge_owner_id',owner_key,true);
 PERFORM set_config('app.purge_trip_id',trip_key::text,true);
 DELETE FROM settlement_adjustments WHERE owner_id=owner_key AND trip_id=trip_key;
 DELETE FROM repayments WHERE owner_id=owner_key AND trip_id=trip_key;
 DELETE FROM settlements WHERE owner_id=owner_key AND trip_id=trip_key;
 DELETE FROM expense_shares WHERE owner_id=owner_key AND trip_id=trip_key;
 DELETE FROM expenses WHERE owner_id=owner_key AND trip_id=trip_key;
 DELETE FROM trip_members WHERE owner_id=owner_key AND trip_id=trip_key;
 DELETE FROM trip_thumbnails WHERE owner_id=owner_key AND trip_id=trip_key;
 DELETE FROM trips WHERE owner_id=owner_key AND id=trip_key;
 UPDATE trip_id_reservations SET purged_at=now() WHERE owner_id=owner_key AND trip_id=trip_key;
 PERFORM set_config('app.purge_owner_id',coalesce(previous_owner,''),true);
 PERFORM set_config('app.purge_trip_id',coalesce(previous_trip,''),true);
EXCEPTION WHEN OTHERS THEN
 PERFORM set_config('app.purge_owner_id',coalesce(previous_owner,''),true);
 PERFORM set_config('app.purge_trip_id',coalesce(previous_trip,''),true);
 RAISE;
END $$;
