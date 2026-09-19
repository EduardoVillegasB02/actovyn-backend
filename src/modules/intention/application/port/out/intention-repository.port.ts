import { Id } from 'src/shared/domain/vo';
import {
  ClosedIntention,
  Intention,
  Prediction,
  Recommendation,
} from '../../../domain/entity';
import {
  ConfidenceLevel,
  FactorKey,
  IntentionStatus,
  RiskLevel,
} from '../../../domain/enum';
import { StatsEntry } from '../../../domain/service';

export const INTENTION_REPOSITORY_PORT = Symbol('IntentionRepositoryPort');

export interface RecommendationView {
  id: string;
  reason: string;
  suggestion: string;
  suggestedAt: Date | null;
  /** null mientras el usuario no haya decidido si la sigue. */
  accepted: boolean | null;
}

export interface PredictionView {
  id: string;
  commitmentScore: number;
  risk: RiskLevel;
  confidence: ConfidenceLevel;
  sampleSize: number;
  /** Los 5 factores tal como quedaron guardados. */
  factors: Record<FactorKey, number>;
  cappedBy: string[];
  createdAt: Date;
  recommendation: RecommendationView | null;
}

/** Una intención con su rastro de predicciones. La primera es la última. */
export interface IntentionView {
  intention: Intention;
  predictions: PredictionView[];
}

export type IntentionSort = 'scheduled_at' | 'created_at';
export type SortOrder = 'asc' | 'desc';

export interface IntentionFilter {
  /** Vacío = todos los estados visibles. */
  statuses: IntentionStatus[];
  /** Rango sobre scheduled_at. */
  from: Date | null;
  to: Date | null;
  /** Para el check-in: pendientes cuya hora ya pasó. */
  scheduledBefore: Date | null;
  category: string | null;
  /** Texto libre sobre el objetivo. */
  query: string | null;
  sort: IntentionSort;
  order: SortOrder;
  limit: number;
  /** Cursor opaco devuelto por la página anterior. */
  cursor: string | null;
  /** Los borradores quedan fuera salvo que se pidan expresamente. */
  includeDrafts: boolean;
}

export interface IntentionPage {
  items: IntentionView[];
  /** null cuando no quedan más páginas. */
  nextCursor: string | null;
  total: number;
}

export interface StatsPeriod {
  from: Date;
  to: Date;
}

export interface IntentionRepositoryPort {
  /**
   * Historial cerrado del usuario para alimentar el motor. Nunca incluye
   * borradores: analizar diez veces no puede cambiar lo que el modelo cree.
   */
  findClosedHistory(userId: Id): Promise<ClosedIntention[]>;

  /** Intención + predicción + recomendación + eventos en UNA transacción. */
  saveAnalysis(
    intention: Intention,
    prediction: Prediction,
    recommendation: Recommendation,
  ): Promise<void>;

  findById(id: Id): Promise<Intention | null>;

  /** La intención con todas sus predicciones, para la pantalla de detalle. */
  findDetail(id: Id): Promise<IntentionView | null>;

  /** Persiste el paso de borrador a compromiso y deja el evento. */
  commit(intention: Intention): Promise<void>;

  /** Persiste el cierre ya aplicado a la entidad y deja el evento. */
  close(intention: Intention): Promise<void>;

  /** Borra un borrador. Lo asumido no se borra, se cancela. */
  delete(id: Id): Promise<void>;

  /** Página del historial, filtrada y ordenada. */
  findPage(userId: Id, filter: IntentionFilter): Promise<IntentionPage>;

  /** Mueve la hora de un borrador y guarda su predicción nueva. */
  rescheduleDraft(
    intention: Intention,
    prediction: Prediction,
    recommendation: Recommendation,
  ): Promise<void>;

  /**
   * Cierra la original como RESCHEDULED y guarda la que la sustituye, con su
   * predicción, en una sola transacción.
   */
  replaceWithReschedule(
    original: Intention,
    replacement: Intention,
    prediction: Prediction,
    recommendation: Recommendation,
  ): Promise<void>;

  /** Deja constancia de si el usuario siguió una recomendación. */
  resolveRecommendation(id: Id, accepted: boolean): Promise<void>;

  /** Filas planas del periodo para armar el panel en memoria. */
  findForStats(userId: Id, period: StatsPeriod): Promise<StatsEntry[]>;

  /** Limpieza de borradores abandonados. Devuelve cuántos se fueron. */
  deleteDraftsOlderThan(cutoff: Date): Promise<number>;
}
