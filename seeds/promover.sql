-- Flujo de revisión humana. Córrelo por partes con tu usuario normal (no ticka_seeder).

-- 1) Revisar pendientes (abre las fuentes de lo que te parezca raro)
SELECT id, categoria, titulo,
       fecha_evento AT TIME ZONE zona_horaria AS fecha_local,
       zona_horaria, precision_fecha, confianza, region, fuente_url, notas
FROM staging.evento_candidato
WHERE estado = 'pendiente'
ORDER BY categoria, fecha_evento;

-- 2) Aprobar y rechazar
-- UPDATE staging.evento_candidato SET estado = 'aprobado',  revisado_en = now() WHERE id IN (1, 2, 3);
-- UPDATE staging.evento_candidato SET estado = 'rechazado', revisado_en = now() WHERE id IN (4);
-- Aprobar todo lo pendiente con confianza alta:
-- UPDATE staging.evento_candidato SET estado = 'aprobado', revisado_en = now()
--  WHERE estado = 'pendiente' AND confianza = 'alta';

-- 3) Promover a producción
-- La tabla real de Ticka es `public.events` (no `countdowns`), con `image_url TEXT
-- NOT NULL` y `category_id UUID` (FK opcional a `categories`, no texto libre).
-- `events.user_id` es NULL-able (mismo modelo que un contador de invitado), así que
-- no hace falta un usuario "sistema".
--
-- Por eso este último paso ya NO es SQL puro: necesita subir una imagen de fondo a
-- DigitalOcean Spaces (vía POST /api/upload) y resolver/crear la categoría (vía
-- GET/POST /api/categories) antes de poder insertar el evento. Corre:
--
--   DATABASE_URL=postgresql://tu_usuario:...@localhost:5433/ticka \
--   TICKA_API_URL=http://localhost:8082 \
--   ADMIN_TOKEN=... \
--   python seeds/promover.py
--
-- Usa el mismo placeholder por categoría (seeds/placeholders/) hasta que reemplaces
-- la imagen desde /admin con una real antes de que el evento sea visible en producción.
