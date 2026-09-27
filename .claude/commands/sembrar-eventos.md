---
description: Lanza los investigadores de eventos en paralelo y carga los candidatos válidos a staging
argument-hint: [categorías opcionales, p. ej. "cine videojuegos"]
---
Vas a orquestar la búsqueda de eventos para Ticka.

1. Lanza EN PARALELO estos subagentes: investigador-deportes, investigador-cine,
   investigador-videojuegos, investigador-conciertos.
   Si el usuario pasó categorías aquí: "$ARGUMENTS", lanza solo esas.
   A cada uno dile únicamente: "Investiga tu categoría y guarda el archivo según seeds/CONTRATO.md. Hoy es <fecha de hoy>."
2. Cuando todos terminen, lista los archivos nuevos en `seeds/candidates/`.
3. Ejecuta primero en seco:
   `python seeds/validar_y_cargar.py --dry-run seeds/candidates/*-<YYYYMMDD de hoy>.json`
4. Si hay rechazos, muéstralos agrupados por motivo. No corrijas fechas por tu cuenta.
5. Ejecuta la carga real (sin `--dry-run`) y muestra el resumen final.

NO ejecutes `seeds/promover.sql` ni escribas en tablas de producción:
la aprobación y publicación la hace un humano.
