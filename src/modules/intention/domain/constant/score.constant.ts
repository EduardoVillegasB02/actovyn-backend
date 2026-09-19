import { FactorKey } from '../enum';

/** Qué versión del motor produjo un número. Se guarda con cada predicción. */
export const MODEL_VERSION = 'score-v1';

/** Prior neutro: "no sé nada de ti" es 50, no 0 ni 100. */
export const NEUTRAL_PRIOR = 50;

/** Pseudo-observaciones del suavizado bayesiano. */
export const SMOOTHING_K = 3;

/** Pesos por defecto. Deben sumar 1; ScoreWeights lo verifica. */
export const DEFAULT_WEIGHTS: Readonly<Record<FactorKey, number>> = {
  [FactorKey.HISTORICAL_ADHERENCE]: 0.35,
  [FactorKey.TIME_COMPATIBILITY]: 0.25,
  [FactorKey.DIFFICULTY_FIT]: 0.2,
  [FactorKey.RECENT_CONSISTENCY]: 0.1,
  [FactorKey.LINGUISTIC_CONFIDENCE]: 0.1,
};

/**
 * Guard rail: política de decisión, no estadística.
 * La media ponderada es compensatoria, y eso deja un hueco: sonar muy seguro
 * (10% del score) taparía haber fallado 6 de 8 veces a esa hora. El guard rail
 * cierra ese hueco topando el score cuando un factor pesado está por el suelo.
 */
export const GUARD_RAIL = {
  /** Solo factores con este peso o más pueden topear el score. */
  minWeight: 0.2,
  /** Umbral por debajo del cual el factor se considera crítico. */
  factorThreshold: 30,
  /** Observaciones reales mínimas para acusar. */
  minEvidence: 3,
  /** Techo del score cuando se dispara: último punto de HIGH_RISK. */
  cap: 39,
} as const;

/** Bandas de riesgo, cerradas y sin solape. */
export const RISK_THRESHOLDS = {
  veryLikely: 80,
  likely: 60,
  uncertain: 40,
  highRisk: 20,
} as const;

/** Intenciones cerradas necesarias para cada nivel de confianza. */
export const CONFIDENCE_THRESHOLDS = {
  high: 15,
  medium: 5,
} as const;

/** Cuántos cierres recientes entran en recent_consistency. */
export const RECENT_WINDOW = 10;

/** Con menos que esto, la adherencia global aún no es "tu comportamiento". */
export const MIN_PRIOR_SAMPLE = 8;

/** Puntos de mejora mínimos para que valga la pena proponer otra franja. */
export const SLOT_IMPROVEMENT_MARGIN = 15;

/** Cuántos cierres se leen por análisis. Techo de seguridad, no de negocio. */
export const HISTORY_LIMIT = 500;

/** Cuántas intenciones devuelve el historial de la pantalla de resultados. */
export const TIMELINE_LIMIT = 50;

/** Franjas con al menos esta muestra pueden ser "tu mejor franja". */
export const MIN_BAND_SAMPLE = 2;
