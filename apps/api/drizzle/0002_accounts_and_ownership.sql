-- Better Auth 1.7.16 core fields, mapped through Drizzle to the isolated auth namespace.
CREATE SCHEMA auth;
CREATE TABLE auth."user" (
 id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
 email_verified boolean NOT NULL, image text,
 created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
);
CREATE TABLE auth.session (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE,
 token text NOT NULL UNIQUE, expires_at timestamptz NOT NULL,
 ip_address text, user_agent text, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
);
CREATE INDEX session_user_id_idx ON auth.session(user_id);
CREATE TABLE auth.account (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE,
 account_id text NOT NULL, provider_id text NOT NULL,
 access_token text, refresh_token text, id_token text,
 access_token_expires_at timestamptz, refresh_token_expires_at timestamptz,
 scope text, password text, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
 CONSTRAINT account_provider_account_uq UNIQUE(provider_id, account_id)
);
CREATE INDEX account_user_id_idx ON auth.account(user_id);
CREATE TABLE auth.verification (
 id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
);
CREATE INDEX verification_identifier_idx ON auth.verification(identifier);

CREATE FUNCTION app_trim(value text) RETURNS text LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
AS $$ SELECT btrim(value, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF') $$;
CREATE TABLE trips (
 id uuid PRIMARY KEY, owner_id text NOT NULL REFERENCES auth."user"(id) ON DELETE RESTRICT,
 name text NOT NULL CHECK(name = app_trim(name) AND char_length(name) > 0),
 start_date date, end_date date,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT trips_owner_id_id_uq UNIQUE(owner_id,id),
 CONSTRAINT trips_date_order CHECK(start_date IS NULL OR end_date IS NULL OR end_date >= start_date)
);
CREATE INDEX trips_owner_created_id_idx ON trips(owner_id,created_at,id);
CREATE TABLE categories (
 id uuid PRIMARY KEY, owner_id text NOT NULL REFERENCES auth."user"(id) ON DELETE RESTRICT,
 name text NOT NULL CHECK(name = app_trim(name) AND char_length(name) BETWEEN 1 AND 30),
 name_key text COLLATE "C" GENERATED ALWAYS AS (translate(name,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')) STORED NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT categories_owner_id_id_uq UNIQUE(owner_id,id),
 CONSTRAINT categories_owner_name_key_uq UNIQUE(owner_id,name_key)
);
CREATE INDEX categories_owner_name_id_idx ON categories(owner_id,name,id);
-- Supporting persistence for truthful ownership-scoped expense/usage counts; no expense routes yet.
CREATE TABLE expenses (
 id uuid PRIMARY KEY, owner_id text NOT NULL, trip_id uuid NOT NULL, category_id uuid,
 item text NOT NULL CHECK(item = app_trim(item) AND char_length(item) > 0),
 amount_minor bigint NOT NULL CHECK(amount_minor > 0),
 currency_code char(3) NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT,
 minor_unit smallint NOT NULL CHECK(minor_unit BETWEEN 0 AND 4), spent_on date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT expenses_owner_trip_fk FOREIGN KEY(owner_id,trip_id) REFERENCES trips(owner_id,id) ON DELETE RESTRICT,
 CONSTRAINT expenses_owner_category_fk FOREIGN KEY(owner_id,category_id) REFERENCES categories(owner_id,id) ON DELETE RESTRICT
);
CREATE INDEX expenses_owner_trip_date_id_idx ON expenses(owner_id,trip_id,spent_on,id);
CREATE INDEX expenses_owner_category_idx ON expenses(owner_id,category_id);
