import { Inject, Injectable, Logger } from '@nestjs/common';
import { HOUR_MS } from 'src/shared/constants/time.contant';
import { Id } from 'src/shared/domain/vo';
import { Zone } from 'src/shared/util/zone.interface';
import {
  BehaviorProfile,
  Prediction,
  Recommendation,
  SlotSuggestion,
} from '../../domain/entity';
import { Difficulty } from '../../domain/enum';
import {
  CommitmentScoreService,
  ExplainContext,
  RecommendationCopyService,
} from '../../domain/service';
import {
  AI_PORT,
  AiPort,
  INTENTION_REPOSITORY_PORT,
  IntentionRepositoryPort,
} from '../port/out';

/** Lo que hace falta para puntuar una intención, venga de donde venga. */
export interface PredictionRequest {
  owner: Id;
  zone: Zone;
  objective: string;
  category: string | null;
  difficulty: Difficulty;
  scheduledAt: Date | null;
  /** 0-100. La aporta el LLM al analizar y se conserva al reprogramar. */
  linguisticConfidence: number;
  now: Date;
}

export interface PredictionResult {
  prediction: Prediction;
  recommendation: Recommendation;
}

/**
 * El pipeline de puntuación, en un solo sitio.
 *
 * Lo usan analizar y reprogramar. Reprogramar reutiliza la
 * linguistic_confidence de la predicción anterior en vez de volver a pedírsela
 * al modelo: mover la hora no cambia lo convencido que sonaba el mensaje, y
 * repreguntarlo haría que el score bailara por motivos ajenos a la hora.
 */
@Injectable()
export class IntentionPredictor {
  private readonly logger = new Logger(IntentionPredictor.name);

  constructor(
    @Inject(AI_PORT)
    private readonly ai: AiPort,
    @Inject(INTENTION_REPOSITORY_PORT)
    private readonly intentionRepository: IntentionRepositoryPort,
  ) {}

  async predict(request: PredictionRequest): Promise<PredictionResult> {
    const { zone, scheduledAt, now } = request;
    const localHour = scheduledAt ? zone.hour(scheduledAt) : null;

    // Historial real del usuario. Una sola lectura, sin borradores.
    const profile = BehaviorProfile.build(
      await this.intentionRepository.findClosedHistory(request.owner),
    );

    // Dominio puro, determinista.
    const { factors, evidence } = profile.deriveFactors({
      category: request.category,
      difficulty: request.difficulty,
      localHour,
      linguisticConfidence: request.linguisticConfidence,
    });
    const prediction = Prediction.build(factors, profile.sampleSize, evidence);

    // La hora alternativa sale de los DATOS, no del modelo.
    const { slot, suggestedAt } = this.proposeSlot(
      profile,
      zone,
      scheduledAt,
      localHour,
      now,
    );

    const recommendation = await this.explain(
      {
        objective: request.objective,
        commitmentScore: prediction.commitmentScore,
        risk: prediction.risk,
        factors,
        weakest: CommitmentScoreService.rankWeakFactors(
          factors,
          prediction.weights,
        ),
        evidence,
        slot,
        localHour,
        sampleSize: profile.sampleSize,
      },
      suggestedAt,
    );

    return { prediction, recommendation };
  }

  /**
   * Busca una franja mejor y la convierte en un instante concreto.
   *
   * Descarta la propuesta si esa hora ya pasó: analizar "hoy a las 11pm" a las
   * 9pm no puede responder "muévela a las 7pm de hoy". Sin slot, la sugerencia
   * cae al consejo de dividir la tarea.
   */
  private proposeSlot(
    profile: BehaviorProfile,
    zone: Zone,
    scheduledAt: Date | null,
    localHour: number | null,
    now: Date,
  ): { slot: SlotSuggestion | null; suggestedAt: Date | null } {
    if (localHour === null || scheduledAt === null)
      return { slot: null, suggestedAt: null };

    const slot = profile.suggestBetterSlot(localHour);
    if (!slot) return { slot: null, suggestedAt: null };

    const suggestedAt = IntentionPredictor.withLocalHour(
      scheduledAt,
      slot.hour,
      zone,
    );
    return suggestedAt.getTime() <= now.getTime()
      ? { slot: null, suggestedAt: null }
      : { slot, suggestedAt };
  }

  /** Mismo día, otra hora local. */
  private static withLocalHour(date: Date, hour: number, zone: Zone): Date {
    return new Date(date.getTime() + (hour - zone.hour(date)) * HOUR_MS);
  }

  /** El LLM solo redacta. Si falla, las reglas responden igual. */
  private async explain(
    ctx: ExplainContext,
    suggestedAt: Date | null,
  ): Promise<Recommendation> {
    try {
      const copy = await this.ai.explain(ctx);
      return Recommendation.create(copy.reason, copy.suggestion, suggestedAt);
    } catch (error) {
      this.logger.warn(
        `El LLM no pudo redactar, uso las reglas del dominio: ${String(error)}`,
      );
      const fallback = RecommendationCopyService.ruleBased(ctx);
      return Recommendation.create(
        fallback.reason,
        fallback.suggestion,
        suggestedAt,
      );
    }
  }
}
