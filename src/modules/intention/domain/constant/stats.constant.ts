/** Cuánto abarca el panel si no se pide otro rango. */
export const DEFAULT_STATS_WEEKS = 12;

/** Días que tiene una semana del gráfico de tendencia. */
export const DAYS_PER_WEEK = 7;

/**
 * Tramos del gráfico de calibración: predicho frente a real.
 *
 * Es la diapositiva que responde "¿y esto funciona?". Si cuando el motor dice
 * 61-80 se cumple el 83%, el número significa algo; si no, tampoco se oculta.
 */
export const CALIBRATION_BUCKETS: readonly {
  label: string;
  from: number;
  to: number;
}[] = [
  { label: '0-20', from: 0, to: 20 },
  { label: '21-40', from: 21, to: 40 },
  { label: '41-60', from: 41, to: 60 },
  { label: '61-80', from: 61, to: 80 },
  { label: '81-100', from: 81, to: 100 },
];

/** Observaciones mínimas para que una frase del panel se pueda afirmar. */
export const MIN_HIGHLIGHT_SAMPLE = 3;

/** Cuántas intenciones lee el panel como mucho. Techo de seguridad. */
export const STATS_LIMIT = 2000;
