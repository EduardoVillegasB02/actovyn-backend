import { Difficulty } from '../../../../../domain/enum';

/** Categorías que el extractor offline sabe reconocer. */
export const CATEGORY_KEYWORDS: readonly {
  category: string;
  words: readonly string[];
}[] = [
  {
    category: 'gym',
    words: [
      'gym',
      'gimnasio',
      'entrenar',
      'entreno',
      'correr',
      'trotar',
      'pesas',
      'ejercicio',
      'nadar',
      'crossfit',
      'yoga',
    ],
  },
  {
    category: 'estudio',
    words: [
      'estudiar',
      'estudio',
      'examen',
      'parcial',
      'tarea',
      'clase',
      'curso',
      'repasar',
      'universidad',
      'tesis',
      'leer',
      'lectura',
      'apuntes',
    ],
  },
  {
    category: 'trabajo',
    words: [
      'informe',
      'reporte',
      'presentacion',
      'presentación',
      'reunion',
      'reunión',
      'entrega',
      'entregable',
      'proyecto',
      'jefe',
      'cliente',
      'trabajo',
      'correo',
      'email',
      'oficina',
      'propuesta',
      'deploy',
      'código',
      'codigo',
      'pitch',
      'sprint',
    ],
  },
  {
    category: 'salud',
    words: [
      'médico',
      'medico',
      'doctor',
      'dentista',
      'cita médica',
      'pastilla',
      'terapia',
      'psicólogo',
      'psicologo',
    ],
  },
  {
    category: 'personal',
    words: [
      'llamar',
      'mamá',
      'mama',
      'papá',
      'papa',
      'familia',
      'amigo',
      'amiga',
      'comprar',
      'limpiar',
      'cocinar',
      'ordenar',
      'pagar',
      'banco',
      'trámite',
      'tramite',
    ],
  },
];

/** Categorías válidas para el LLM. Debe coincidir con las de arriba. */
export const CATEGORIES: readonly string[] = [
  'trabajo',
  'estudio',
  'gym',
  'salud',
  'personal',
  'finanzas',
  'hogar',
  'social',
];

export const DIFFICULTY_WORDS: Readonly<
  Record<Difficulty.HIGH | Difficulty.LOW, readonly string[]>
> = {
  [Difficulty.HIGH]: [
    'terminar',
    'termino',
    'terminaré',
    'acabar',
    'informe',
    'tesis',
    'examen',
    'parcial',
    'presentación',
    'presentacion',
    'proyecto',
    'entregar',
    'entrega',
    'estudiar',
    'redactar',
    'escribir',
    'deploy',
    'propuesta',
  ],
  [Difficulty.LOW]: [
    'llamar',
    'llamo',
    'comprar',
    'enviar',
    'mandar',
    'mensaje',
    'pagar',
    'leer un',
    'responder',
    'avisar',
    'agendar',
  ],
};

/** Lenguaje que sube la convicción. */
export const STRONG_WORDS: readonly string[] = [
  'sí o sí',
  'si o si',
  'seguro',
  'definitivamente',
  'sin falta',
  'tengo que',
  'debo',
  'voy a',
  'pase lo que pase',
  'obligatorio',
];

/** Lenguaje que la baja. Cada uno resta. */
export const HEDGE_WORDS: readonly string[] = [
  'tratar',
  'trataré',
  'tratare',
  'intentar',
  'intentaré',
  'intentare',
  'ojalá',
  'ojala',
  'quizás',
  'quizas',
  'tal vez',
  'a ver si',
  'puede que',
  'creo que',
  'si puedo',
  'si me da tiempo',
  'capaz',
];

export const WEEKDAYS: readonly string[] = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

/** Mismo orden que WEEKDAYS, sin tildes, para comparar texto normalizado. */
export const WEEKDAYS_ASCII: readonly string[] = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
];

/** Puntuación base de convicción y sus ajustes. */
export const CONFIDENCE_SCORING = {
  base: 75,
  withExplicitHour: 10,
  withStrongLanguage: 10,
  perHedge: -20,
} as const;
