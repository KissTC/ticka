-- Staging para eventos propuestos por los agentes.
-- Nada de aquí es visible en el sitio hasta que se promueve con promover.sql.

CREATE SCHEMA IF NOT EXISTS staging;

CREATE TABLE IF NOT EXISTS staging.evento_candidato (
    id                bigserial PRIMARY KEY,
    slug              text        NOT NULL,
    titulo            text        NOT NULL,
    categoria         text        NOT NULL CHECK (categoria IN ('deportes','cine','videojuegos','conciertos')),
    descripcion_corta text,
    fecha_evento      timestamptz NOT NULL,
    fecha_dia         date        NOT NULL,   -- día local del evento, para deduplicar
    zona_horaria      text        NOT NULL,
    precision_fecha   text        NOT NULL CHECK (precision_fecha IN ('exacta','dia')),
    region            text,
    fuente_url        text        NOT NULL,
    fuente_2_url      text,
    confianza         text        NOT NULL CHECK (confianza IN ('alta','media')),
    notas             text,
    estado            text        NOT NULL DEFAULT 'pendiente'
                                  CHECK (estado IN ('pendiente','aprobado','rechazado','publicado')),
    archivo_origen    text,
    creado_en         timestamptz NOT NULL DEFAULT now(),
    revisado_en       timestamptz,
    UNIQUE (slug, fecha_dia)
);

CREATE INDEX IF NOT EXISTS evento_candidato_estado_idx
    ON staging.evento_candidato (estado, categoria, fecha_evento);

-- Recomendado: un usuario que SOLO puede escribir en staging.
-- Es el que usa validar_y_cargar.py, así el flujo automático no puede tocar producción.
-- CREATE ROLE ticka_seeder LOGIN PASSWORD 'cambia-esto';
-- GRANT USAGE ON SCHEMA staging TO ticka_seeder;
-- GRANT SELECT, INSERT ON staging.evento_candidato TO ticka_seeder;
-- GRANT USAGE ON SEQUENCE staging.evento_candidato_id_seq TO ticka_seeder;
