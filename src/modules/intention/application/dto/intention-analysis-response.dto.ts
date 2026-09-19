import {
  ConfidenceLevel,
  Difficulty,
  FactorKey,
  IntentionStatus,
  RiskLevel,
} from '../../domain/enum';

export class AnalyzedIntentionDto {
  id: string;
  objective: string;
  category: string | null;
  /** Instante en UTC. La hora local vive en localHour. */
  scheduledAt: Date | null;
  localHour: number | null;
  difficulty: Difficulty;
  /** Siempre DRAFT al analizar: todavía no es un compromiso. */
  status: IntentionStatus;
}

export class RecommendationResponseDto {
  id: string;
  reason: string;
  suggestion: string;
  /** Hora alternativa propuesta, en UTC. */
  suggestedAt: Date | null;
}

/** El veredicto del motor y todo lo que lo sostiene, sin la intención. */
export class PredictionSnapshotDto {
  /** Los 5 factores, 0-100. */
  analysis: Record<FactorKey, number>;
  /** Cuántas observaciones respaldan cada factor contable. */
  evidence: Record<string, number>;
  commitmentScore: number;
  risk: RiskLevel;
  confidence: ConfidenceLevel;
  sampleSize: number;
  /** Factores que dispararon el guard rail. Vacío si no se topó nada. */
  cappedBy: string[];
  recommendation: RecommendationResponseDto;
}

/** Lo que devuelve un análisis: la intención recién creada y su veredicto. */
export class IntentionAnalysisResponseDto extends PredictionSnapshotDto {
  intention: AnalyzedIntentionDto;
}
