// Catálogo de demo. Precios en ARS, inventados para el hackathon.
// En producción esto viene de cada operador local (empresa de bus, guía, productora).

export type Lang = 'es' | 'en' | 'pt';
export type Category = 'bus' | 'tour' | 'event';

export interface Item {
  id: string;
  category: Category;
  name: string;
  priceArs: number;
  desc: Record<Lang, string>;
}

export const catalog: Item[] = [
  // Pasajes de bus
  {
    id: 'bus-purma',
    category: 'bus',
    name: 'San Salvador de Jujuy → Purmamarca',
    priceArs: 9500,
    desc: { es: 'Ida, 1 h 15 min. Salidas cada 2 h.', en: 'One way, 1 h 15 min. Every 2 h.', pt: 'Ida, 1 h 15 min. Saídas a cada 2 h.' },
  },
  {
    id: 'bus-tilcara',
    category: 'bus',
    name: 'San Salvador de Jujuy → Tilcara',
    priceArs: 11000,
    desc: { es: 'Ida, 1 h 45 min.', en: 'One way, 1 h 45 min.', pt: 'Ida, 1 h 45 min.' },
  },
  {
    id: 'bus-huma',
    category: 'bus',
    name: 'San Salvador de Jujuy → Humahuaca',
    priceArs: 14500,
    desc: { es: 'Ida, 2 h 30 min.', en: 'One way, 2 h 30 min.', pt: 'Ida, 2 h 30 min.' },
  },
  // Excursiones
  {
    id: 'tour-hornocal',
    category: 'tour',
    name: 'Serranía de Hornocal (14 Colores)',
    priceArs: 45000,
    desc: { es: 'En 4x4 desde Humahuaca, 4 h.', en: '4x4 from Humahuaca, 4 h.', pt: 'De 4x4 saindo de Humahuaca, 4 h.' },
  },
  {
    id: 'tour-salinas',
    category: 'tour',
    name: 'Salinas Grandes + Cuesta de Lipán',
    priceArs: 70000,
    desc: { es: 'Día completo desde Purmamarca.', en: 'Full day from Purmamarca.', pt: 'Dia inteiro saindo de Purmamarca.' },
  },
  {
    id: 'tour-garganta',
    category: 'tour',
    name: 'Garganta del Diablo, Tilcara',
    priceArs: 30000,
    desc: { es: 'Trekking guiado, 3 h.', en: 'Guided trek, 3 h.', pt: 'Trilha guiada, 3 h.' },
  },
  // Eventos
  {
    id: 'ev-pena',
    category: 'event',
    name: 'Peña folklórica en Tilcara',
    priceArs: 18000,
    desc: { es: 'Sábado 28/11, 21 h. Incluye empanadas.', en: 'Saturday 11/28, 9 pm. Empanadas included.', pt: 'Sábado 28/11, 21 h. Inclui empanadas.' },
  },
  {
    id: 'ev-feria',
    category: 'event',
    name: 'Feria Sabores de la Puna, Purmamarca',
    priceArs: 8000,
    desc: { es: 'Domingo 29/11, 11 a 19 h. Degustación incluida.', en: 'Sunday 11/29, 11 am to 7 pm. Tasting included.', pt: 'Domingo 29/11, 11 às 19 h. Degustação incluída.' },
  },
  {
    id: 'ev-carnaval',
    category: 'event',
    name: 'Carnaval de Humahuaca 2027 (preventa)',
    priceArs: 35000,
    desc: { es: 'Desentierro, sábado 6/2/2027. Lugar en la comparsa.', en: 'Desentierro, Saturday 2/6/2027. Spot in a comparsa.', pt: 'Desentierro, sábado 6/2/2027. Lugar na comparsa.' },
  },
];

export const byCategory = (c: Category) => catalog.filter((i) => i.category === c);
export const findItem = (id: string) => catalog.find((i) => i.id === id);
