# Contrato de salida para los investigadores de eventos

Todos los subagentes investigadores siguen estas reglas. Si una regla choca con tu
instrucción de categoría, gana este contrato.

## Reglas de veracidad (las más importantes)
- Solo incluye eventos con fecha CONFIRMADA por una fuente oficial (sitio del evento,
  distribuidora, estudio, liga, boletera) o un medio reconocido.
- `fuente_url` debe ser una página que abriste con WebFetch en ESTA sesión y que
  menciona la fecha. Nunca pongas una URL de memoria ni una que no abriste.
- Si solo hay mes, temporada o "2027" sin día: NO lo incluyas.
- Si tu confianza en la fecha no es al menos "media": NO lo incluyas.
- Nunca inventes ni "estimes" fechas u horas.

## Alcance
- Solo eventos desde mañana hasta 12 meses a partir de hoy.
- Máximo 15 eventos por archivo. Prioriza los de mayor interés para público de
  México y Latinoamérica, más los grandes eventos globales.
- Sin duplicados dentro del archivo.

## Fechas y zonas horarias
- `fecha_evento` en ISO 8601 CON offset, p. ej. `2026-12-18T20:00:00-06:00`.
- `zona_horaria` en formato IANA, p. ej. `America/Mexico_City`, `America/New_York`, `Europe/Madrid`.
  Es la zona donde ocurre el evento (o la del país del estreno).
- Si conoces la hora: `precision_fecha: "exacta"`.
- Si solo conoces el día: usa `00:00` en la zona del evento y `precision_fecha: "dia"`.

## Formato del archivo
Escribe SOLO JSON válido (sin markdown, sin comentarios) en:
`seeds/candidates/{categoria}-{YYYYMMDD}.json` (fecha de hoy)

```json
{
  "categoria": "cine",
  "generado_en": "2026-09-26T12:00:00-06:00",
  "eventos": [
    {
      "titulo": "Estreno de <Película> en México",
      "categoria": "cine",
      "descripcion_corta": "Una línea, máximo 140 caracteres.",
      "fecha_evento": "2026-12-18T00:00:00-06:00",
      "zona_horaria": "America/Mexico_City",
      "precision_fecha": "dia",
      "region": "MX",
      "fuente_url": "https://...",
      "fuente_2_url": "https://... (opcional)",
      "confianza": "alta",
      "notas": "Opcional: aclaraciones útiles para el revisor."
    }
  ]
}
```

Valores permitidos:
- `categoria`: deportes | cine | videojuegos | conciertos
- `precision_fecha`: exacta | dia
- `confianza`: alta | media
- `region`: código de país (MX, US, ES...) o `global`

## Respuesta al orquestador
Al terminar, responde en UNA línea: cuántos eventos guardaste y la ruta del archivo.
No repitas el JSON en tu respuesta.
