-- Migración 011: aceptar la categoría "esports" en staging.evento_candidato (Tarea 5).
-- El CHECK original solo permitía deportes, cine, videojuegos y conciertos.
-- Solo aplica si el schema de staging existe (se crea con seeds/schema_staging.sql).
-- Ejecutar: psql $DB_CONN_STR -f db/migrations/011_staging_esports.sql

DO $$
BEGIN
    IF to_regclass('staging.evento_candidato') IS NOT NULL THEN
        ALTER TABLE staging.evento_candidato DROP CONSTRAINT IF EXISTS evento_candidato_categoria_check;
        ALTER TABLE staging.evento_candidato ADD CONSTRAINT evento_candidato_categoria_check
            CHECK (categoria IN ('deportes', 'cine', 'videojuegos', 'conciertos', 'esports'));
    END IF;
END $$;
