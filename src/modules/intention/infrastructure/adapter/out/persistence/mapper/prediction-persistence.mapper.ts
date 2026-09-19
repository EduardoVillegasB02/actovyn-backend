import { Prisma } from 'generated/prisma/client';
import {
  Prediction,
  Recommendation,
} from 'src/modules/intention/domain/entity';
import {
  ConfidenceLevel,
  FactorKey,
  RiskLevel,
} from 'src/modules/intention/domain/enum';
import { PredictionView } from 'src/modules/intention/application/port/out';

/** Columnas de `prediction` sin la clave foránea, que pone el repositorio. */
export interface PredictionRow {
  id: string;
  commitment_score: number;
  risk: RiskLevel;
  confidence: ConfidenceLevel;
  sample_size: number;
  historical_adherence: number;
  time_compatibility: number;
  difficulty_fit: number;
  recent_consistency: number;
  linguistic_confidence: number;
  weights: Prisma.InputJsonValue;
  capped_by: string[];
  model_version: string;
}

export interface RecommendationRow {
  id: string;
  reason: string;
  suggestion: string;
  suggested_at: Date | null;
}

/** Fila de predicción leída junto a su recomendación. */
export interface PredictionWithRecommendationRow {
  id: string;
  commitment_score: number;
  risk: string;
  confidence: string;
  sample_size: number;
  historical_adherence: number;
  time_compatibility: number;
  difficulty_fit: number;
  recent_consistency: number;
  linguistic_confidence: number;
  capped_by: string[];
  created_at: Date;
  recommendation: {
    id: string;
    reason: string;
    suggestion: string;
    suggested_at: Date | null;
    accepted: boolean | null;
  } | null;
}

export class PredictionPersistenceMapper {
  /**
   * Los 5 factores se guardan en columnas propias, no en un JSON: así se
   * pueden consultar y graficar sin desempaquetar nada.
   */
  static toPersistence(prediction: Prediction): PredictionRow {
    const factors = prediction.factors;
    return {
      id: prediction.id.value,
      commitment_score: prediction.commitmentScore,
      risk: prediction.risk,
      confidence: prediction.confidence,
      sample_size: prediction.sampleSize,
      historical_adherence: factors.historicalAdherence,
      time_compatibility: factors.timeCompatibility,
      difficulty_fit: factors.difficultyFit,
      recent_consistency: factors.recentConsistency,
      linguistic_confidence: factors.linguisticConfidence,
      weights: prediction.weights.toRecord(),
      capped_by: [...prediction.cappedBy],
      model_version: prediction.modelVersion,
    };
  }

  static recommendationToPersistence(
    recommendation: Recommendation,
  ): RecommendationRow {
    return {
      id: recommendation.id.value,
      reason: recommendation.reason,
      suggestion: recommendation.suggestion,
      suggested_at: recommendation.suggestedAt,
    };
  }

  static toView(row: PredictionWithRecommendationRow): PredictionView {
    return {
      id: row.id,
      commitmentScore: row.commitment_score,
      risk: row.risk as RiskLevel,
      confidence: row.confidence as ConfidenceLevel,
      sampleSize: row.sample_size,
      factors: {
        [FactorKey.HISTORICAL_ADHERENCE]: row.historical_adherence,
        [FactorKey.TIME_COMPATIBILITY]: row.time_compatibility,
        [FactorKey.DIFFICULTY_FIT]: row.difficulty_fit,
        [FactorKey.RECENT_CONSISTENCY]: row.recent_consistency,
        [FactorKey.LINGUISTIC_CONFIDENCE]: row.linguistic_confidence,
      },
      cappedBy: row.capped_by,
      createdAt: row.created_at,
      recommendation: row.recommendation
        ? {
            id: row.recommendation.id,
            reason: row.recommendation.reason,
            suggestion: row.recommendation.suggestion,
            suggestedAt: row.recommendation.suggested_at,
            accepted: row.recommendation.accepted,
          }
        : null,
    };
  }
}
