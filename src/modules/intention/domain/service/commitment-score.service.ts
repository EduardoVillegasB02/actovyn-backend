import { InvalidInputException } from 'src/shared/domain/exception';
import { clamp, round1 } from 'src/shared/util/number.util';
import {
  CONFIDENCE_THRESHOLDS,
  GUARD_RAIL,
  NEUTRAL_PRIOR,
  RISK_THRESHOLDS,
  SMOOTHING_K,
} from '../constant';
import {
  COUNTABLE_FACTOR_KEYS,
  ConfidenceLevel,
  FACTOR_KEYS,
  FactorKey,
  RiskLevel,
} from '../enum';
import { FactorEvidence, ScoreFactors, ScoreWeights } from '../vo';

export interface RankedFactor {
  factor: FactorKey;
  value: number;
  weight: number;
}

export interface GuardRailResult {
  score: number;
  cappedBy: FactorKey[];
}

/**
 * EL MOTOR. Fórmula del Commitment Score, suavizado bayesiano, guard rail y
 * bandas de riesgo. Todo determinista y sin dependencias de infraestructura:
 * se testea en milisegundos, sin base de datos ni red.
 *
 * El LLM NUNCA entra aquí. Solo aporta linguistic_confidence, que pesa 10%.
 */
export class CommitmentScoreService {
  /**
   * Suavizado bayesiano: (éxitos + k * prior/100) / (total + k) * 100.
   *
   * Resuelve el arranque en frío. Sin datos devuelve el prior en vez de un 0
   * que condenaría a un usuario nuevo. Y 1 de 1 da 62.5, no 100: un solo
   * acierto no es un patrón. Con muestra grande converge a la tasa real.
   */
  static smoothedRate(
    successes: number,
    total: number,
    prior: number = NEUTRAL_PRIOR,
    k: number = SMOOTHING_K,
  ): number {
    if (total < 0 || successes < 0 || successes > total)
      throw new InvalidInputException(
        `smoothedRate: éxitos=${successes} total=${total} inválidos`,
      );
    const rate = ((successes + (k * prior) / 100) / (total + k)) * 100;
    return round1(clamp(rate));
  }

  /** Media ponderada, determinista, redondeada a entero 0-100. */
  static compute(factors: ScoreFactors, weights: ScoreWeights): number {
    const raw = FACTOR_KEYS.reduce(
      (acc, key) => acc + factors.of(key) * weights.of(key),
      0,
    );
    return Math.round(clamp(raw));
  }

  /**
   * Guard rail. Si un factor con peso >= 0.20 está por debajo de 30 Y tiene
   * al menos 3 observaciones reales, el score se topea en 39.
   *
   * linguistic_confidence nunca lo dispara: no tiene evidencia contable, y
   * sonar convencido no es haber cumplido.
   */
  static applyGuardRails(
    score: number,
    factors: ScoreFactors,
    evidence: FactorEvidence,
    weights: ScoreWeights,
  ): GuardRailResult {
    const cappedBy = COUNTABLE_FACTOR_KEYS.filter(
      (key) =>
        weights.of(key) >= GUARD_RAIL.minWeight &&
        factors.of(key) < GUARD_RAIL.factorThreshold &&
        evidence.of(key) >= GUARD_RAIL.minEvidence,
    );
    return {
      score: cappedBy.length ? Math.min(score, GUARD_RAIL.cap) : score,
      cappedBy: [...cappedBy],
    };
  }

  /**
   * VERY_LIKELY 80-100 | LIKELY 60-79 | UNCERTAIN 40-59
   * HIGH_RISK 20-39 | VERY_HIGH_RISK 0-19
   */
  static classifyRisk(score: number): RiskLevel {
    if (score >= RISK_THRESHOLDS.veryLikely) return RiskLevel.VERY_LIKELY;
    if (score >= RISK_THRESHOLDS.likely) return RiskLevel.LIKELY;
    if (score >= RISK_THRESHOLDS.uncertain) return RiskLevel.UNCERTAIN;
    if (score >= RISK_THRESHOLDS.highRisk) return RiskLevel.HIGH_RISK;
    return RiskLevel.VERY_HIGH_RISK;
  }

  /** Mide el respaldo del score: n = intenciones cerradas del usuario. */
  static classifyConfidence(sampleSize: number): ConfidenceLevel {
    if (sampleSize >= CONFIDENCE_THRESHOLDS.high) return ConfidenceLevel.HIGH;
    if (sampleSize >= CONFIDENCE_THRESHOLDS.medium)
      return ConfidenceLevel.MEDIUM;
    return ConfidenceLevel.LOW;
  }

  /** De peor a mejor: el primero es el que más explica un score bajo. */
  static rankWeakFactors(
    factors: ScoreFactors,
    weights: ScoreWeights,
  ): RankedFactor[] {
    return FACTOR_KEYS.map((factor) => ({
      factor,
      value: factors.of(factor),
      weight: weights.of(factor),
    })).sort((a, b) => a.value - b.value || b.weight - a.weight);
  }
}
