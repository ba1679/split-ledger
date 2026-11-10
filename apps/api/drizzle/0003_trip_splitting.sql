-- Upgrade the archived personal ledger without changing original expense values.
ALTER TABLE trips ADD COLUMN simplify_debts boolean NOT NULL DEFAULT false;
ALTER TABLE trips ADD COLUMN accounting_revision bigint NOT NULL DEFAULT 0 CHECK (accounting_revision >= 0);

CREATE TYPE trip_member_role AS ENUM ('owner', 'companion');
CREATE TYPE payment_record_kind AS ENUM ('independent', 'settlement');

CREATE TABLE trip_members (
 id uuid PRIMARY KEY, owner_id text NOT NULL, trip_id uuid NOT NULL,
 role trip_member_role NOT NULL,
 name text NOT NULL CHECK(name = app_trim(name) AND char_length(name) > 0),
 name_key text COLLATE "C" GENERATED ALWAYS AS (translate(name,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')) STORED NOT NULL,
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT trip_members_owner_trip_id_uq UNIQUE(owner_id,trip_id,id),
 CONSTRAINT trip_members_trip_name_key_uq UNIQUE(trip_id,name_key),
 CONSTRAINT trip_members_owner_trip_fk FOREIGN KEY(owner_id,trip_id) REFERENCES trips(owner_id,id) ON DELETE RESTRICT,
 CONSTRAINT trip_members_active_owner CHECK(role <> 'owner' OR is_active)
);
CREATE UNIQUE INDEX trip_members_one_owner_uq ON trip_members(trip_id) WHERE role='owner';
CREATE INDEX trip_members_owner_trip_role_idx ON trip_members(owner_id,trip_id,role);

INSERT INTO trip_members(id,owner_id,trip_id,role,name)
 SELECT gen_random_uuid(),t.owner_id,t.id,'owner',app_trim(u.name)
 FROM trips t JOIN auth."user" u ON u.id=t.owner_id;

ALTER TABLE expenses ADD COLUMN payer_member_id uuid;
UPDATE expenses e SET payer_member_id=m.id FROM trip_members m
 WHERE m.owner_id=e.owner_id AND m.trip_id=e.trip_id AND m.role='owner';
ALTER TABLE expenses ALTER COLUMN payer_member_id SET NOT NULL;
ALTER TABLE expenses ADD CONSTRAINT expenses_owner_trip_id_uq UNIQUE(owner_id,trip_id,id);
ALTER TABLE expenses ADD CONSTRAINT expenses_payer_member_fk FOREIGN KEY(owner_id,trip_id,payer_member_id)
 REFERENCES trip_members(owner_id,trip_id,id) ON DELETE RESTRICT;

CREATE TABLE expense_shares (
 owner_id text NOT NULL, trip_id uuid NOT NULL, expense_id uuid NOT NULL, member_id uuid NOT NULL,
 CONSTRAINT expense_shares_pk PRIMARY KEY(expense_id,member_id),
 CONSTRAINT expense_shares_expense_fk FOREIGN KEY(owner_id,trip_id,expense_id) REFERENCES expenses(owner_id,trip_id,id) ON DELETE CASCADE,
 CONSTRAINT expense_shares_member_fk FOREIGN KEY(owner_id,trip_id,member_id) REFERENCES trip_members(owner_id,trip_id,id) ON DELETE RESTRICT
);
CREATE INDEX expense_shares_owner_trip_member_idx ON expense_shares(owner_id,trip_id,member_id);
INSERT INTO expense_shares(owner_id,trip_id,expense_id,member_id)
 SELECT owner_id,trip_id,id,payer_member_id FROM expenses;

CREATE FUNCTION app_integer(value numeric) RETURNS boolean LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
 AS $$ SELECT value NOT IN ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric) AND value=trunc(value) $$;

CREATE TABLE settlements (
 id uuid PRIMARY KEY, owner_id text NOT NULL, trip_id uuid NOT NULL,
 debtor_member_id uuid NOT NULL, creditor_member_id uuid NOT NULL,
 currency_code char(3) NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT,
 obligation_numerator numeric NOT NULL CHECK(app_integer(obligation_numerator) AND obligation_numerator > 0),
 obligation_denominator numeric NOT NULL CHECK(app_integer(obligation_denominator) AND obligation_denominator > 0),
 obligation_minor_unit smallint NOT NULL CHECK(obligation_minor_unit BETWEEN 0 AND 4),
 arrangement_key text NOT NULL, source_revision bigint NOT NULL CHECK(source_revision >= 0),
 simplify_debts boolean NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(debtor_member_id <> creditor_member_id),
 CONSTRAINT settlements_arrangement_key_uq UNIQUE(owner_id,trip_id,arrangement_key),
 CONSTRAINT settlements_owner_trip_id_uq UNIQUE(owner_id,trip_id,id),
 CONSTRAINT settlements_trip_fk FOREIGN KEY(owner_id,trip_id) REFERENCES trips(owner_id,id) ON DELETE RESTRICT,
 CONSTRAINT settlements_debtor_fk FOREIGN KEY(owner_id,trip_id,debtor_member_id) REFERENCES trip_members(owner_id,trip_id,id) ON DELETE RESTRICT,
 CONSTRAINT settlements_creditor_fk FOREIGN KEY(owner_id,trip_id,creditor_member_id) REFERENCES trip_members(owner_id,trip_id,id) ON DELETE RESTRICT
);
CREATE INDEX settlements_source_idx ON settlements(owner_id,trip_id,source_revision,debtor_member_id,creditor_member_id,currency_code);

CREATE TABLE repayments (
 id uuid PRIMARY KEY, owner_id text NOT NULL, trip_id uuid NOT NULL,
 payer_member_id uuid NOT NULL, payee_member_id uuid NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor > 0),
 currency_code char(3) NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT,
 minor_unit smallint NOT NULL CHECK(minor_unit BETWEEN 0 AND 4), paid_on date NOT NULL,
 kind payment_record_kind NOT NULL, settlement_id uuid UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(payer_member_id <> payee_member_id),
 CHECK((kind='settlement') = (settlement_id IS NOT NULL)),
 CONSTRAINT repayments_owner_trip_id_uq UNIQUE(owner_id,trip_id,id),
 CONSTRAINT repayments_trip_fk FOREIGN KEY(owner_id,trip_id) REFERENCES trips(owner_id,id) ON DELETE RESTRICT,
 CONSTRAINT repayments_payer_fk FOREIGN KEY(owner_id,trip_id,payer_member_id) REFERENCES trip_members(owner_id,trip_id,id) ON DELETE RESTRICT,
 CONSTRAINT repayments_payee_fk FOREIGN KEY(owner_id,trip_id,payee_member_id) REFERENCES trip_members(owner_id,trip_id,id) ON DELETE RESTRICT,
 CONSTRAINT repayments_settlement_fk FOREIGN KEY(owner_id,trip_id,settlement_id) REFERENCES settlements(owner_id,trip_id,id) ON DELETE RESTRICT
);
CREATE INDEX repayments_owner_trip_date_id_idx ON repayments(owner_id,trip_id,paid_on,id);

CREATE TABLE settlement_adjustments (
 settlement_id uuid NOT NULL, owner_id text NOT NULL, trip_id uuid NOT NULL, member_id uuid NOT NULL,
 currency_code char(3) NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT,
 numerator numeric NOT NULL CHECK(app_integer(numerator)),
 denominator numeric NOT NULL CHECK(app_integer(denominator) AND denominator > 0),
 minor_unit smallint NOT NULL CHECK(minor_unit BETWEEN 0 AND 4),
 CONSTRAINT settlement_adjustments_pk PRIMARY KEY(settlement_id,member_id),
 CONSTRAINT settlement_adjustments_settlement_fk FOREIGN KEY(owner_id,trip_id,settlement_id) REFERENCES settlements(owner_id,trip_id,id) ON DELETE RESTRICT,
 CONSTRAINT settlement_adjustments_member_fk FOREIGN KEY(owner_id,trip_id,member_id) REFERENCES trip_members(owner_id,trip_id,id) ON DELETE RESTRICT
);
CREATE INDEX settlement_adjustments_member_currency_idx ON settlement_adjustments(owner_id,trip_id,member_id,currency_code);

-- Owner identity and historical payment facts cannot be rewritten or removed.
CREATE FUNCTION app_protect_owner() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.role='owner' AND (TG_OP='DELETE' OR NEW IS DISTINCT FROM OLD) THEN
   RAISE EXCEPTION 'Fixed owner member is immutable' USING ERRCODE='23514';
 END IF;
 IF TG_OP='UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
   RAISE EXCEPTION 'Member role is immutable' USING ERRCODE='23514';
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER trip_members_protect_owner BEFORE UPDATE OR DELETE ON trip_members
 FOR EACH ROW EXECUTE FUNCTION app_protect_owner();

CREATE FUNCTION app_immutable_payment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Historical payment facts are immutable' USING ERRCODE='23514';
END $$;
CREATE TRIGGER repayments_immutable BEFORE UPDATE OR DELETE ON repayments FOR EACH ROW EXECUTE FUNCTION app_immutable_payment();
CREATE TRIGGER settlements_immutable BEFORE UPDATE OR DELETE ON settlements FOR EACH ROW EXECUTE FUNCTION app_immutable_payment();
CREATE TRIGGER settlement_adjustments_immutable BEFORE UPDATE OR DELETE ON settlement_adjustments FOR EACH ROW EXECUTE FUNCTION app_immutable_payment();

-- Deferred checks allow atomic insertion/replacement but reject incomplete commits.
CREATE FUNCTION app_check_trip_owner() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid;
BEGIN
 IF TG_TABLE_NAME='trips' THEN target:=NEW.id;
 ELSE target:=NEW.trip_id;
 END IF;
 IF EXISTS(SELECT 1 FROM trips WHERE id=target) AND
    (SELECT count(*) FROM trip_members WHERE trip_id=target AND role='owner') <> 1 THEN
   RAISE EXCEPTION 'Trip requires exactly one owner member' USING ERRCODE='23514';
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER trips_require_owner AFTER INSERT OR UPDATE ON trips DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION app_check_trip_owner();
CREATE CONSTRAINT TRIGGER members_require_owner AFTER INSERT OR UPDATE ON trip_members DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION app_check_trip_owner();

CREATE FUNCTION app_check_expense_shares() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid;
BEGIN
 IF TG_TABLE_NAME='expenses' THEN target:=NEW.id;
 ELSIF TG_OP='DELETE' THEN target:=OLD.expense_id;
 ELSE target:=NEW.expense_id;
 END IF;
 IF EXISTS(SELECT 1 FROM expenses WHERE id=target) AND
    NOT EXISTS(SELECT 1 FROM expense_shares WHERE expense_id=target) THEN
   RAISE EXCEPTION 'Expense requires at least one share' USING ERRCODE='23514';
 END IF;
 IF TG_TABLE_NAME='expense_shares' AND TG_OP='UPDATE' THEN
   IF OLD.expense_id<>NEW.expense_id AND
      EXISTS(SELECT 1 FROM expenses WHERE id=OLD.expense_id) AND
      NOT EXISTS(SELECT 1 FROM expense_shares WHERE expense_id=OLD.expense_id) THEN
     RAISE EXCEPTION 'Expense requires at least one share' USING ERRCODE='23514';
   END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER expenses_require_shares AFTER INSERT OR UPDATE ON expenses DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION app_check_expense_shares();
CREATE CONSTRAINT TRIGGER shares_require_nonempty AFTER INSERT OR UPDATE OR DELETE ON expense_shares DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION app_check_expense_shares();

CREATE FUNCTION app_check_settlement_complete() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; s settlements%ROWTYPE; r repayments%ROWTYPE; a settlement_adjustments%ROWTYPE;
BEGIN
 IF TG_TABLE_NAME='settlements' THEN target:=NEW.id;
 ELSE target:=NEW.settlement_id;
 END IF;
 IF target IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO s FROM settlements WHERE id=target;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO r FROM repayments WHERE settlement_id=target;
 IF NOT FOUND OR r.kind<>'settlement' OR r.payer_member_id<>s.debtor_member_id OR
    r.payee_member_id<>s.creditor_member_id OR r.currency_code<>s.currency_code OR
    (SELECT count(*) FROM settlement_adjustments WHERE settlement_id=target)<>2 THEN
   RAISE EXCEPTION 'Settlement requires matching payment and paired adjustments' USING ERRCODE='23514';
 END IF;
 FOR a IN SELECT * FROM settlement_adjustments WHERE settlement_id=target LOOP
   IF a.member_id NOT IN(s.debtor_member_id,s.creditor_member_id) OR a.currency_code<>s.currency_code OR
      a.numerator * s.obligation_denominator * power(10::numeric,s.obligation_minor_unit) * power(10::numeric,r.minor_unit)
      <> (CASE WHEN a.member_id=s.debtor_member_id THEN 1 ELSE -1 END) * a.denominator * power(10::numeric,a.minor_unit) *
         (s.obligation_numerator * power(10::numeric,r.minor_unit) - r.amount_minor * s.obligation_denominator * power(10::numeric,s.obligation_minor_unit)) THEN
     RAISE EXCEPTION 'Settlement adjustment does not match obligation minus payment' USING ERRCODE='23514';
   END IF;
 END LOOP;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER settlements_complete AFTER INSERT ON settlements DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION app_check_settlement_complete();
CREATE CONSTRAINT TRIGGER repayments_complete AFTER INSERT ON repayments DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION app_check_settlement_complete();
CREATE CONSTRAINT TRIGGER adjustments_complete AFTER INSERT ON settlement_adjustments DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION app_check_settlement_complete();
