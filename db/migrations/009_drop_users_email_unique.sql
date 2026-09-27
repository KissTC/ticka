-- Migración 009: quitar UNIQUE en users.email
-- Algunas bases se crearon con un esquema viejo que tenía email UNIQUE. El backend
-- crea usuarios con email = '', así que solo cabía un usuario y los demás fallaban
-- al hacer upsert (sus contadores quedaban como invitado y no podían reclamarse).
-- La identidad del usuario es clerk_id, que sí es UNIQUE.
-- Ejecutar: psql $DB_CONN_STR -f db/migrations/009_drop_users_email_unique.sql

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
