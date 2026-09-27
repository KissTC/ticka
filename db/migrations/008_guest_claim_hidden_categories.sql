-- Migración 008: reclamar contadores de invitado + ocultar categorías
-- Ejecutar: psql $DB_CONN_STR -f db/migrations/008_guest_claim_hidden_categories.sql

-- Token secreto que se entrega al invitado al crear un contador; permite
-- asignarlo a su cuenta después de registrarse. Se borra al reclamarlo.
ALTER TABLE events ADD COLUMN IF NOT EXISTS claim_token TEXT;

-- Categorías ocultas no aparecen en listados públicos, sitemap ni en /categoria/:slug
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;
