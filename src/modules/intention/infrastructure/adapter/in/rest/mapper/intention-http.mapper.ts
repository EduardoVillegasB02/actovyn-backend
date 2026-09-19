import {
  IntentionAnalysisResponseDto,
  IntentionPageResponseDto,
  IntentionResponseDto,
  PredictionSnapshotDto,
  RescheduleResponseDto,
} from 'src/modules/intention/application/dto';

/**
 * Contrato HTTP en snake_case.
 *
 * Dentro el código va en camelCase, como el resto del backend; el cliente web
 * habla snake_case. Esta capa es la costura donde se traduce, así que
 * renombrar algo dentro no rompe a nadie fuera.
 */
export interface RecommendationHttp {
  id: string;
  reason: string;
  suggestion: string;
  suggested_at: Date | null;
}

export interface AnalyzedIntentionHttp {
  id: string;
  objective: string;
  category: string | null;
  scheduled_at: Date | null;
  local_hour: number | null;
  difficulty: string;
  status: string;
}

export interface PredictionSnapshotHttp {
  analysis: Record<string, number>;
  evidence: Record<string, number>;
  commitment_score: number;
  risk: string;
  confidence: string;
  sample_size: number;
  capped_by: string[];
  recommendation: RecommendationHttp;
}

export interface AnalyzeIntentionHttpResponse extends PredictionSnapshotHttp {
  intention: AnalyzedIntentionHttp;
}

export interface PredictionHttp {
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
  recommendation: (RecommendationHttp & { accepted: boolean | null }) | null;
}

export interface IntentionHttpResponse {
  id: string;
  objective: string;
  category: string | null;
  raw_message: string;
  scheduled_at: Date | null;
  local_hour: number | null;
  weekday: number | null;
  difficulty: string;
  status: string;
  closed_at: Date | null;
  created_at: Date;
  rescheduled_from_id: string | null;
  predictions: PredictionHttp[];
}

export interface IntentionPageHttpResponse {
  items: IntentionHttpResponse[];
  next_cursor: string | null;
  total: number;
}

export interface RescheduleHttpResponse {
  intention: IntentionHttpResponse;
  prediction: PredictionSnapshotHttp;
  /** El score de antes, para poder enseñar el salto: 39 -> 68. */
  previous_score: number | null;
}

export class IntentionHttpMapper {
  static toAnalyzeHttp(
    dto: IntentionAnalysisResponseDto,
  ): AnalyzeIntentionHttpResponse {
    return {
      intention: {
        id: dto.intention.id,
        objective: dto.intention.objective,
        category: dto.intention.category,
        scheduled_at: dto.intention.scheduledAt,
        local_hour: dto.intention.localHour,
        difficulty: dto.intention.difficulty,
        status: dto.intention.status,
      },
      ...IntentionHttpMapper.toSnapshotHttp(dto),
    };
  }

  static toSnapshotHttp(dto: PredictionSnapshotDto): PredictionSnapshotHttp {
    return {
      analysis: dto.analysis,
      evidence: dto.evidence,
      commitment_score: dto.commitmentScore,
      risk: dto.risk,
      confidence: dto.confidence,
      sample_size: dto.sampleSize,
      capped_by: dto.cappedBy,
      recommendation: {
        id: dto.recommendation.id,
        reason: dto.recommendation.reason,
        suggestion: dto.recommendation.suggestion,
        suggested_at: dto.recommendation.suggestedAt,
      },
    };
  }

  static toRescheduleHttp(dto: RescheduleResponseDto): RescheduleHttpResponse {
    return {
      intention: IntentionHttpMapper.toHttp(dto.intention),
      prediction: IntentionHttpMapper.toSnapshotHttp(dto.prediction),
      previous_score: dto.previousScore,
    };
  }

  static toHttp(dto: IntentionResponseDto): IntentionHttpResponse {
    return {
      id: dto.id,
      objective: dto.objective,
      category: dto.category,
      raw_message: dto.rawMessage,
      scheduled_at: dto.scheduledAt,
      local_hour: dto.localHour,
      weekday: dto.weekday,
      difficulty: dto.difficulty,
      status: dto.status,
      closed_at: dto.closedAt,
      created_at: dto.createdAt,
      rescheduled_from_id: dto.rescheduledFromId,
      predictions: dto.predictions.map((prediction) => ({
        id: prediction.id,
        commitment_score: prediction.commitmentScore,
        risk: prediction.risk,
        confidence: prediction.confidence,
        sample_size: prediction.sampleSize,
        // Los factores se aplanan: el cliente los pinta uno a uno.
        historical_adherence: prediction.factors.historical_adherence,
        time_compatibility: prediction.factors.time_compatibility,
        difficulty_fit: prediction.factors.difficulty_fit,
        recent_consistency: prediction.factors.recent_consistency,
        linguistic_confidence: prediction.factors.linguistic_confidence,
        capped_by: prediction.cappedBy,
        created_at: prediction.createdAt,
        recommendation: prediction.recommendation
          ? {
              id: prediction.recommendation.id,
              reason: prediction.recommendation.reason,
              suggestion: prediction.recommendation.suggestion,
              suggested_at: prediction.recommendation.suggestedAt,
              accepted: prediction.recommendation.accepted,
            }
          : null,
      })),
    };
  }

  static toPageHttp(dto: IntentionPageResponseDto): IntentionPageHttpResponse {
    return {
      items: dto.items.map((item) => IntentionHttpMapper.toHttp(item)),
      next_cursor: dto.nextCursor,
      total: dto.total,
    };
  }
}
