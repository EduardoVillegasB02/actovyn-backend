import { IntentionPageResponseDto, IntentionResponseDto } from '../dto';
import { IntentionPage, IntentionView } from '../port/out';

export class IntentionResponseMapper {
  static toResponse(view: IntentionView): IntentionResponseDto {
    const { intention } = view;
    return {
      id: intention.id.value,
      objective: intention.objective,
      category: intention.category,
      rawMessage: intention.rawMessage,
      scheduledAt: intention.scheduledAt,
      localHour: intention.localHour,
      weekday: intention.weekday,
      difficulty: intention.difficulty,
      status: intention.status,
      closedAt: intention.closedAt,
      createdAt: intention.createdAt,
      rescheduledFromId: intention.rescheduledFromId?.value ?? null,
      predictions: view.predictions.map((prediction) => ({
        id: prediction.id,
        commitmentScore: prediction.commitmentScore,
        risk: prediction.risk,
        confidence: prediction.confidence,
        sampleSize: prediction.sampleSize,
        factors: prediction.factors,
        cappedBy: prediction.cappedBy,
        createdAt: prediction.createdAt,
        recommendation: prediction.recommendation
          ? {
              id: prediction.recommendation.id,
              reason: prediction.recommendation.reason,
              suggestion: prediction.recommendation.suggestion,
              suggestedAt: prediction.recommendation.suggestedAt,
              accepted: prediction.recommendation.accepted,
            }
          : null,
      })),
    };
  }

  static toPageResponse(page: IntentionPage): IntentionPageResponseDto {
    return {
      items: page.items.map((item) => IntentionResponseMapper.toResponse(item)),
      nextCursor: page.nextCursor,
      total: page.total,
    };
  }
}
