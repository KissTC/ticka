-- Migración 010: atribución first-touch (de dónde viene cada usuario y cada contador)
-- El frontend guarda en localStorage los UTM, ref y referrer de la primera visita y los
-- envía al crear un contador y al iniciar sesión. En users se guarda una sola vez
-- (attributed_at marca que ya se asignó) y nunca se sobrescribe.
-- Ejecutar: psql $DB_CONN_STR -f db/migrations/010_attribution.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_source     VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_medium     VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_campaign   VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS ref            VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_referrer VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS landing_path   VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS attributed_at  TIMESTAMPTZ;

ALTER TABLE events ADD COLUMN IF NOT EXISTS utm_source     VARCHAR(100);
ALTER TABLE events ADD COLUMN IF NOT EXISTS utm_medium     VARCHAR(100);
ALTER TABLE events ADD COLUMN IF NOT EXISTS utm_campaign   VARCHAR(100);
ALTER TABLE events ADD COLUMN IF NOT EXISTS ref            VARCHAR(100);
ALTER TABLE events ADD COLUMN IF NOT EXISTS first_referrer VARCHAR(255);

-- Reporte rápido por fuente (lo mismo que GET /api/admin/attribution):
--
-- SELECT CASE WHEN attributed_at IS NULL THEN 'sin atribución'
--        ELSE COALESCE(NULLIF(utm_source, ''), NULLIF(ref, ''), NULLIF(first_referrer, ''), 'directo') END AS fuente,
--        COUNT(*) AS registros,
--        COUNT(*) FILTER (WHERE plan = 'pro') AS pro
-- FROM users
-- GROUP BY 1
-- ORDER BY registros DESC;
