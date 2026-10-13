// Fechas fijas de México que se buscan cada año ("¿cuánto falta para la quincena?").
// Se calculan solas, sin base de datos: cada fecha define sus ocurrencias por año y la
// página muestra la próxima. Todas las horas son de la Ciudad de México.

export const TZ_MX = "America/Mexico_City";

export interface Ocurrencia {
  inicio: Date;
  dias: number; // cuántos días dura ("¡Hoy es…!" mientras no termine)
  etiqueta?: string; // nombre de esta ocurrencia, ej. "Día de la Constitución"
}

export interface Pregunta {
  pregunta: string;
  respuesta: string;
}

export interface FechaEspecial {
  slug: string; // URL: /cuanto-falta/<slug>
  nombre: string; // "la quincena" → "¿Cuánto falta para la quincena?"
  hoy: string; // "¡Hoy es quincena!"
  emoji: string;
  colores: [string, string]; // degradado de fondo (página e imagen OG)
  descripcion: string; // párrafo introductorio y base de la meta descripción
  preguntas: Pregunta[];
  ocurrencias: (anio: number) => Ocurrencia[];
}

// La Ciudad de México está en UTC-6 todo el año (sin horario de verano desde 2022)
export function cdmx(anio: number, mes: number, dia: number, hora = 0): Date {
  return new Date(Date.UTC(anio, mes - 1, dia, hora + 6));
}

function ultimoDiaDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

// n-ésimo día de la semana del mes (diaSemana: 0 = domingo, 1 = lunes…)
function enesimoDia(anio: number, mes: number, diaSemana: number, n: number): number {
  const primero = new Date(Date.UTC(anio, mes - 1, 1)).getUTCDay();
  return 1 + ((diaSemana - primero + 7) % 7) + (n - 1) * 7;
}

// Domingo de Pascua (algoritmo gregoriano anónimo)
function pascua(anio: number): { mes: number; dia: number } {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return { mes, dia };
}

function unDia(anio: number, mes: number, dia: number, hora = 0): Ocurrencia[] {
  return [{ inicio: cdmx(anio, mes, dia, hora), dias: 1 }];
}

// Fechas de El Buen Fin confirmadas por año (cambian cada año: agregar la del siguiente cuando se anuncie).
// 2026: Secretaría de Economía y Concanaco, reportado por Bloomberg Línea y N+.
const BUEN_FIN: Record<number, { mes: number; dia: number; dias: number }> = {
  2026: { mes: 11, dia: 13, dias: 5 },
};

export const FECHAS: FechaEspecial[] = [
  {
    slug: "quincena",
    nombre: "la quincena",
    hoy: "¡Hoy es quincena!",
    emoji: "💸",
    colores: ["#064e3b", "#0f172a"],
    descripcion:
      "En México la mayoría de las empresas paga la quincena los días 15 y el último día de cada mes. Mira en vivo cuántos días, horas y minutos faltan para la próxima.",
    preguntas: [
      {
        pregunta: "¿Qué días se paga la quincena?",
        respuesta:
          "Lo más común es pagar el día 15 y el último día de cada mes (30 o 31, y 28 o 29 en febrero). Cada empresa puede tener su propio calendario de pago.",
      },
      {
        pregunta: "¿Qué pasa si la quincena cae en fin de semana o día festivo?",
        respuesta:
          "Muchas empresas adelantan el pago al día hábil anterior, normalmente el viernes. Revisa la política de tu empresa para confirmarlo.",
      },
    ],
    ocurrencias: (anio) =>
      Array.from({ length: 12 }, (_, i) => i + 1).flatMap((mes) => [
        ...unDia(anio, mes, 15),
        ...unDia(anio, mes, ultimoDiaDelMes(anio, mes)),
      ]),
  },
  {
    slug: "aguinaldo",
    nombre: "el aguinaldo",
    hoy: "¡Hoy es el último día para pagar el aguinaldo!",
    emoji: "🎁",
    colores: ["#7f1d1d", "#14532d"],
    descripcion:
      "La Ley Federal del Trabajo establece que el aguinaldo debe pagarse antes del 20 de diciembre. Mira cuánto falta para la fecha límite.",
    preguntas: [
      {
        pregunta: "¿Cuándo se paga el aguinaldo?",
        respuesta:
          "Según el artículo 87 de la Ley Federal del Trabajo, a más tardar el 20 de diciembre. Muchas empresas lo pagan antes, en la primera quincena de diciembre.",
      },
      {
        pregunta: "¿Cuánto me toca de aguinaldo?",
        respuesta:
          "La ley marca como mínimo el equivalente a 15 días de salario. Si no trabajaste el año completo, te corresponde la parte proporcional a los días trabajados. Tu contrato puede darte más.",
      },
    ],
    ocurrencias: (anio) => unDia(anio, 12, 20),
  },
  {
    slug: "navidad",
    nombre: "Navidad",
    hoy: "¡Feliz Navidad!",
    emoji: "🎄",
    colores: ["#7f1d1d", "#052e16"],
    descripcion: "Cuenta regresiva en vivo para la Navidad, el 25 de diciembre, en hora de la Ciudad de México.",
    preguntas: [
      {
        pregunta: "¿Cuándo es Navidad?",
        respuesta: "El 25 de diciembre. La Nochebuena, cuando muchas familias cenan juntas, es la noche del 24.",
      },
      {
        pregunta: "¿El 25 de diciembre es día de descanso obligatorio?",
        respuesta: "Sí. Es uno de los días de descanso obligatorio del artículo 74 de la Ley Federal del Trabajo.",
      },
    ],
    ocurrencias: (anio) => unDia(anio, 12, 25),
  },
  {
    slug: "ano-nuevo",
    nombre: "Año Nuevo",
    hoy: "¡Feliz Año Nuevo!",
    emoji: "🎆",
    colores: ["#1e1b4b", "#713f12"],
    descripcion: "Cuenta regresiva en vivo para el Año Nuevo: los segundos que faltan para la medianoche del 1 de enero en la Ciudad de México.",
    preguntas: [
      {
        pregunta: "¿A qué hora es Año Nuevo en México?",
        respuesta:
          "A las 00:00 del 1 de enero. La mayor parte del país, incluida la Ciudad de México, usa la misma hora; estados como Baja California, Sonora o Quintana Roo tienen una diferencia.",
      },
    ],
    ocurrencias: (anio) => unDia(anio, 1, 1),
  },
  {
    slug: "dia-de-reyes",
    nombre: "el Día de Reyes",
    hoy: "¡Hoy es Día de Reyes!",
    emoji: "👑",
    colores: ["#713f12", "#312e81"],
    descripcion: "Cuenta regresiva para el Día de Reyes, el 6 de enero, día de la rosca y de los regalos de los Reyes Magos.",
    preguntas: [
      {
        pregunta: "¿Cuándo es el Día de Reyes?",
        respuesta: "El 6 de enero. Es tradición partir la rosca de Reyes; a quien le sale el muñequito le toca invitar los tamales el 2 de febrero, Día de la Candelaria.",
      },
    ],
    ocurrencias: (anio) => unDia(anio, 1, 6),
  },
  {
    slug: "san-valentin",
    nombre: "San Valentín",
    hoy: "¡Feliz Día del Amor y la Amistad!",
    emoji: "💘",
    colores: ["#831843", "#1e1b4b"],
    descripcion: "Cuenta regresiva para el Día del Amor y la Amistad, el 14 de febrero.",
    preguntas: [
      {
        pregunta: "¿Cuándo es San Valentín?",
        respuesta: "El 14 de febrero, Día del Amor y la Amistad.",
      },
    ],
    ocurrencias: (anio) => unDia(anio, 2, 14),
  },
  {
    slug: "semana-santa",
    nombre: "Semana Santa",
    hoy: "¡Ya es Semana Santa!",
    emoji: "🌴",
    colores: ["#0e7490", "#713f12"],
    descripcion:
      "Semana Santa cambia de fecha cada año porque depende de la Pascua. Mira cuánto falta para el Domingo de Ramos, el día en que empieza.",
    preguntas: [
      {
        pregunta: "¿Por qué Semana Santa cambia de fecha cada año?",
        respuesta:
          "Porque se calcula a partir del Domingo de Pascua, que es el primer domingo después de la primera luna llena de primavera. Semana Santa va del Domingo de Ramos al Domingo de Resurrección.",
      },
      {
        pregunta: "¿Jueves y Viernes Santo son días de descanso obligatorio?",
        respuesta:
          "No están en el artículo 74 de la Ley Federal del Trabajo, aunque muchas empresas y escuelas los dan libres. Las vacaciones escolares las define el calendario de la SEP.",
      },
    ],
    ocurrencias: (anio) => {
      const { mes, dia } = pascua(anio);
      const domingoDeRamos = new Date(cdmx(anio, mes, dia).getTime() - 7 * 86400000);
      return [{ inicio: domingoDeRamos, dias: 8 }];
    },
  },
  {
    slug: "dia-del-nino",
    nombre: "el Día del Niño",
    hoy: "¡Feliz Día del Niño!",
    emoji: "🎈",
    colores: ["#0369a1", "#a16207"],
    descripcion: "Cuenta regresiva para el Día del Niño en México, el 30 de abril.",
    preguntas: [
      {
        pregunta: "¿Cuándo es el Día del Niño en México?",
        respuesta: "El 30 de abril. En otros países se celebra en fechas distintas.",
      },
    ],
    ocurrencias: (anio) => unDia(anio, 4, 30),
  },
  {
    slug: "dia-de-las-madres",
    nombre: "el Día de las Madres",
    hoy: "¡Feliz Día de las Madres!",
    emoji: "💐",
    colores: ["#9d174d", "#4c1d95"],
    descripcion: "Cuenta regresiva para el Día de las Madres en México, que siempre se celebra el 10 de mayo.",
    preguntas: [
      {
        pregunta: "¿Cuándo es el Día de las Madres en México?",
        respuesta: "Siempre el 10 de mayo, sin importar el día de la semana. En Estados Unidos y otros países es el segundo domingo de mayo.",
      },
    ],
    ocurrencias: (anio) => unDia(anio, 5, 10),
  },
  {
    slug: "dia-del-padre",
    nombre: "el Día del Padre",
    hoy: "¡Feliz Día del Padre!",
    emoji: "👔",
    colores: ["#1e3a8a", "#134e4a"],
    descripcion: "Cuenta regresiva para el Día del Padre en México, que se celebra el tercer domingo de junio.",
    preguntas: [
      {
        pregunta: "¿Cuándo es el Día del Padre en México?",
        respuesta: "El tercer domingo de junio, así que cambia de fecha cada año.",
      },
    ],
    ocurrencias: (anio) => unDia(anio, 6, enesimoDia(anio, 6, 0, 3)),
  },
  {
    slug: "grito-de-independencia",
    nombre: "el Grito de Independencia",
    hoy: "¡Viva México!",
    emoji: "🇲🇽",
    colores: ["#14532d", "#7f1d1d"],
    descripcion:
      "Cuenta regresiva para el Grito de Independencia, la noche del 15 de septiembre a las 23:00, hora de la Ciudad de México.",
    preguntas: [
      {
        pregunta: "¿A qué hora es el Grito de Independencia?",
        respuesta:
          "Tradicionalmente a las 23:00 del 15 de septiembre, desde el balcón de Palacio Nacional. El 16 de septiembre es día de descanso obligatorio.",
      },
    ],
    ocurrencias: (anio) => [{ inicio: cdmx(anio, 9, 15, 23), dias: 1 }],
  },
  {
    slug: "halloween",
    nombre: "Halloween",
    hoy: "¡Feliz Halloween!",
    emoji: "🎃",
    colores: ["#7c2d12", "#1e1b4b"],
    descripcion: "Cuenta regresiva para Halloween, la noche del 31 de octubre.",
    preguntas: [
      {
        pregunta: "¿Cuándo es Halloween?",
        respuesta: "El 31 de octubre. En México se junta con el inicio de las celebraciones de Día de Muertos, el 1 y 2 de noviembre.",
      },
    ],
    ocurrencias: (anio) => unDia(anio, 10, 31),
  },
  {
    slug: "dia-de-muertos",
    nombre: "el Día de Muertos",
    hoy: "¡Hoy es Día de Muertos!",
    emoji: "💀",
    colores: ["#9a3412", "#3b0764"],
    descripcion:
      "Cuenta regresiva para el Día de Muertos, que se celebra el 1 y 2 de noviembre. Pon tu ofrenda a tiempo.",
    preguntas: [
      {
        pregunta: "¿Cuándo es el Día de Muertos?",
        respuesta:
          "Se celebra el 1 y 2 de noviembre. Por tradición, el 1 se recuerda a los niños (Todos Santos) y el 2 a los adultos. Muchas familias ponen la ofrenda desde finales de octubre.",
      },
      {
        pregunta: "¿El Día de Muertos es día de descanso obligatorio?",
        respuesta: "No está en el artículo 74 de la Ley Federal del Trabajo, aunque algunas escuelas y empresas lo dan libre.",
      },
    ],
    ocurrencias: (anio) => [{ inicio: cdmx(anio, 11, 1), dias: 2 }],
  },
  {
    slug: "buen-fin",
    nombre: "El Buen Fin",
    hoy: "¡Ya empezó El Buen Fin!",
    emoji: "🛍️",
    colores: ["#1e3a8a", "#831843"],
    descripcion:
      "El Buen Fin es el fin de semana de ofertas más grande de México. Mira cuánto falta para que empiecen los descuentos.",
    preguntas: [
      {
        pregunta: "¿Cuándo es El Buen Fin?",
        respuesta:
          "Se celebra cada año en noviembre, cerca del puente del Día de la Revolución. Las fechas las anuncian la Secretaría de Economía y la Concanaco Servytur.",
      },
      {
        pregunta: "¿Cómo evito ofertas engañosas?",
        respuesta:
          "Compara precios desde antes, guarda tus tickets y, si algo no se respeta, puedes presentar una queja ante la Profeco.",
      },
    ],
    ocurrencias: (anio) => {
      const bf = BUEN_FIN[anio];
      return bf ? [{ inicio: cdmx(anio, bf.mes, bf.dia), dias: bf.dias }] : [];
    },
  },
  {
    slug: "proximo-dia-festivo",
    nombre: "el próximo día festivo",
    hoy: "¡Hoy es día festivo!",
    emoji: "🏖️",
    colores: ["#155e75", "#3f6212"],
    descripcion:
      "Los días de descanso obligatorio en México los marca el artículo 74 de la Ley Federal del Trabajo. Mira cuál es el próximo y cuánto falta.",
    preguntas: [
      {
        pregunta: "¿Cuáles son los días de descanso obligatorio en México?",
        respuesta:
          "1 de enero, el primer lunes de febrero (Constitución), el tercer lunes de marzo (natalicio de Benito Juárez), 1 de mayo, 16 de septiembre, el tercer lunes de noviembre (Revolución), 25 de diciembre y el 1 de octubre cada seis años, cuando hay cambio de presidente.",
      },
      {
        pregunta: "¿Si trabajo en día festivo me deben pagar más?",
        respuesta:
          "Sí. Según el artículo 75 de la Ley Federal del Trabajo, además de tu salario del día te deben pagar el doble por el servicio prestado (salario triple en total).",
      },
    ],
    ocurrencias: (anio) => {
      const festivos: Ocurrencia[] = [
        { inicio: cdmx(anio, 1, 1), dias: 1, etiqueta: "Año Nuevo" },
        { inicio: cdmx(anio, 2, enesimoDia(anio, 2, 1, 1)), dias: 1, etiqueta: "Día de la Constitución" },
        { inicio: cdmx(anio, 3, enesimoDia(anio, 3, 1, 3)), dias: 1, etiqueta: "Natalicio de Benito Juárez" },
        { inicio: cdmx(anio, 5, 1), dias: 1, etiqueta: "Día del Trabajo" },
        { inicio: cdmx(anio, 9, 16), dias: 1, etiqueta: "Día de la Independencia" },
        { inicio: cdmx(anio, 11, enesimoDia(anio, 11, 1, 3)), dias: 1, etiqueta: "Día de la Revolución" },
        { inicio: cdmx(anio, 12, 25), dias: 1, etiqueta: "Navidad" },
      ];
      if ((anio - 2024) % 6 === 0) {
        festivos.push({ inicio: cdmx(anio, 10, 1), dias: 1, etiqueta: "Transmisión del Poder Ejecutivo" });
      }
      return festivos;
    },
  },
];

export function getFecha(slug: string): FechaEspecial | undefined {
  return FECHAS.find((f) => f.slug === slug);
}

export interface Estado {
  actual: Ocurrencia | null; // en curso ahora mismo ("¡Hoy es…!")
  siguiente: Ocurrencia | null; // la próxima que todavía no empieza (null si aún no se anuncia)
}

export function estadoFecha(fecha: FechaEspecial, ahora: Date = new Date()): Estado {
  const anio = ahora.getUTCFullYear();
  const todas = [anio - 1, anio, anio + 1]
    .flatMap((a) => fecha.ocurrencias(a))
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

  const t = ahora.getTime();
  const actual = todas.find((o) => o.inicio.getTime() <= t && t < o.inicio.getTime() + o.dias * 86400000) ?? null;
  const siguiente = todas.find((o) => o.inicio.getTime() > t) ?? null;
  return { actual, siguiente };
}

// "Faltan 12 días" / "Faltan 5 horas" (texto del servidor para SEO y redes; el contador en vivo corre en el cliente)
export function textoFaltan(inicio: Date, ahora: Date = new Date()): string {
  const ms = inicio.getTime() - ahora.getTime();
  const dias = Math.floor(ms / 86400000);
  if (dias >= 2) return `Faltan ${dias} días`;
  if (dias === 1) return "Falta 1 día";
  const horas = Math.floor(ms / 3600000);
  if (horas >= 1) return `Faltan ${horas} ${horas === 1 ? "hora" : "horas"}`;
  return "Falta menos de una hora";
}

export function formatoFecha(fecha: Date, conHora = false): string {
  return fecha.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ_MX,
    ...(conHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function tituloFecha(fecha: FechaEspecial): string {
  return `¿Cuánto falta para ${fecha.nombre}?`;
}
