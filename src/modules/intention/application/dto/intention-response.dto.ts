import {
  ConfidenceLevel,
  Difficulty,
  FactorKey,
  IntentionStatus,
  RiskLevel,
} from '../../domain/enum';

export class PredictionResponseDto {
  id: string;
  commitmentScore: number;
  risk: RiskLevel;
  confidence: ConfidenceLevel;
  sampleSize: number;
  factors: Record<FactorKey, number>;
  cappedBy: string[];
  createdAt: Date;
  recommendation: {
    id: string;
    reason: string;
    suggestion: string;
    suggestedAt: Date | null;
    accepted: boolean | null;
  } | null;
}

/** La forma completa de una intención en el historial y en el detalle. */
export class IntentionResponseDto {
  id: string;
  objective: string;
  category: string | null;
  rawMessage: string;
  scheduledAt: Date | null;
  localHour: number | null;
  weekday: number | null;
  difficulty: Difficulty;
  status: IntentionStatus;
  closedAt: Date | null;
  createdAt: Date;
  rescheduledFromId: string | null;
  /** La más reciente primero. */
  predictions: PredictionResponseDto[];
}

export class IntentionPageResponseDto {
  items: IntentionResponseDto[];
  nextCursor: string | null;
  total: number;
}
