CREATE EXTENSION IF NOT EXISTS postgis;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'toilet_type') THEN
    CREATE TYPE toilet_type AS ENUM ('public', 'community', 'host_opened');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
    CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS toilets (
  id UUID PRIMARY KEY,
  source_record_id TEXT UNIQUE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  toilet_type toilet_type NOT NULL DEFAULT 'public',
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  opening_hours TEXT,
  opening_hours_detail TEXT,
  is_open_now BOOLEAN,
  is_accessible BOOLEAN NOT NULL DEFAULT FALSE,
  is_free BOOLEAN NOT NULL DEFAULT TRUE,
  owner_type TEXT,
  managing_org TEXT,
  phone TEXT,
  has_emergency_bell BOOLEAN NOT NULL DEFAULT FALSE,
  has_entrance_cctv BOOLEAN NOT NULL DEFAULT FALSE,
  has_diaper_table BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status verification_status NOT NULL DEFAULT 'verified',
  source TEXT,
  raw_source JSONB,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS toilets_location_idx ON toilets USING GIST (location);
CREATE INDEX IF NOT EXISTS toilets_source_record_id_idx ON toilets (source_record_id);

-- Nearby query example:
-- SELECT
--   id,
--   name,
--   address,
--   ST_Y(location::geometry) AS latitude,
--   ST_X(location::geometry) AS longitude,
--   ST_Distance(
--     location,
--     ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography
--   ) AS distance_meters
-- FROM toilets
-- WHERE ST_DWithin(
--   location,
--   ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
--   1500
-- )
-- AND (:open_now IS NULL OR is_open_now = :open_now)
-- ORDER BY distance_meters
-- LIMIT 50;
