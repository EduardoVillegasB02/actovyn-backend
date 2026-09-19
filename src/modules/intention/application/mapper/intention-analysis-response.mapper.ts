import { Intention, Prediction, Recommendation } from '../../domain/entity';
import { IntentionAnalysisResponseDto, PredictionSnapshotDto } from '../dto';

export class IntentionAnalysisResponseMapper {
  static toResponse(
    intention: Intention,
    prediction: Prediction,
    recommendation: Recommendation,
  ): IntentionAnalysisResponseDto {
    return {
      intention: {
        id: intention.id.value,
        objective: intention.objective,
        category: intention.category,
        scheduledAt: intention.scheduledAt,
        localHour: intention.localHour,
        difficulty: intention.difficulty,
        status: intention.status,
      },
      ...IntentionAnalysisResponseMapper.toSnapshot(prediction, recommendation),
    };
  }

  /** El veredicto solo, para cuando la intención se devuelve aparte. */
  static toSnapshot(
    prediction: Prediction,
    recommendation: Recommendation,
  ): PredictionSnapshotDto {
    return {
      analysis: prediction.factors.toRecord(),
      evidence: prediction.evidence.toRecord(),
      commitmentScore: prediction.commitmentScore,
      risk: prediction.risk,
      confidence: prediction.confidence,
      sampleSize: prediction.sampleSize,
      cappedBy: [...prediction.cappedBy],
      recommendation: {
        id: recommendation.id.value,
        reason: recommendation.reason,
        suggestion: recommendation.suggestion,
        suggestedAt: recommendation.suggestedAt,
      },
    };
  }
}
