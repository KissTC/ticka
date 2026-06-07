-- Migración 003: Contadores Patrocinados (B2B)
-- Ejecutar: psql $DB_CONN_STR -f db/migrations/003_sponsored.sql

ALTER TABLE events ADD COLUMN IF NOT EXISTS is_sponsored  BOOLEAN      NOT NULL DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS sponsor_label VARCHAR(100);
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_pinned     BOOLEAN      NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_events_pinned    ON events(is_pinned)    WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_events_sponsored ON events(is_sponsored) WHERE is_sponsored = true;
