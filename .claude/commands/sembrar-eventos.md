---
description: Lanza los investigadores de eventos en paralelo y valida los candidatos (la carga a staging se hace en el VPS)
argument-hint: [categorías opcionales, p. ej. "videojuegos esports"]
---
Vas a orquestar la búsqueda de eventos para Ticka.

1. Para cada categoría que vas a investigar, consulta los eventos **ya publicados** en producción
   (solo lectura): `curl -s "https://api.ticka.dev/api/events?category=<categoria>"` y quédate con
   la lista de títulos y fechas. Si la categoría todavía no existe, la lista queda vacía.
2. Lanza EN PARALELO estos subagentes: investigador-deportes, investigador-cine,
   investigador-videojuegos, investigador-conciertos, investigador-esports.
   Si el usuario pasó categorías aquí: "$ARGUMENTS", lanza solo esas.
   A cada uno dile únicamente: "Investiga tu categoría y guarda el archivo según seeds/CONTRATO.md.
   Hoy es <fecha de hoy>. Ya publicados (no los repitas): <lista de títulos con fecha, o 'ninguno'>."
3. Cuando todos terminen, lista los archivos nuevos en `seeds/candidates/`.
4. Valida en seco:
   `python3 seeds/validar_y_cargar.py --dry-run seeds/candidates/*-<YYYYMMDD de hoy>.json`
5. Si hay rechazos, muéstralos agrupados por motivo. No corrijas fechas por tu cuenta.
6. Muestra un resumen por categoría (cuántos válidos, cuántos de confianza media) y termina
   indicando que la carga a staging, la revisión y la promoción se hacen en el VPS
   (DEPLOY.md, secciones 6.2 a 6.6).

NO cargues a ninguna base de datos, NO ejecutes `seeds/promover.py` ni `seeds/promover.sql`:
la carga, la aprobación y la publicación las hace un humano en el VPS.
