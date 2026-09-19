/**
 * Los 5 factores del Commitment Score. Vocabulario inmutable: estos valores
 * son a la vez las columnas de `prediction` y las claves que consume el
 * frontend, así que se escriben en snake_case a propósito.
 */
export enum FactorKey {
  HISTORICAL_ADHERENCE = 'historical_adherence',
  TIME_COMPATIBILITY = 'time_compatibility',
  DIFFICULTY_FIT = 'difficulty_fit',
  RECENT_CONSISTENCY = 'recent_consistency',
  LINGUISTIC_CONFIDENCE = 'linguistic_confidence',
}

export const FACTOR_KEYS: readonly FactorKey[] = [
  FactorKey.HISTORICAL_ADHERENCE,
  FactorKey.TIME_COMPATIBILITY,
  FactorKey.DIFFICULTY_FIT,
  FactorKey.RECENT_CONSISTENCY,
  FactorKey.LINGUISTIC_CONFIDENCE,
];

/**
 * Factores respaldados por observaciones contables del historial.
 * recent_consistency se deriva de los mismos cierres y linguistic_confidence
 * sale del texto: ninguno tiene evidencia propia que auditar.
 */
export type CountableFactorKey =
  | FactorKey.HISTORICAL_ADHERENCE
  | FactorKey.TIME_COMPATIBILITY
  | FactorKey.DIFFICULTY_FIT;

export const COUNTABLE_FACTOR_KEYS: readonly CountableFactorKey[] = [
  FactorKey.HISTORICAL_ADHERENCE,
  FactorKey.TIME_COMPATIBILITY,
  FactorKey.DIFFICULTY_FIT,
];
