import { Inject, Injectable } from '@nestjs/common';
import { InvalidInputException } from 'src/shared/domain/exception';
import { Id } from 'src/shared/domain/vo';
import { Zone } from 'src/shared/util/zone.interface';
import { Intention, Prediction, Recommendation } from '../../domain/entity';
import { FactorKey, IntentionStatus } from '../../domain/enum';
import { IntentionNotFoundException } from '../../domain/exception';
import {
  IntentionResponseDto,
  RescheduleIntentionDto,
  RescheduleResponseDto,
} from '../dto';
import {
  IntentionAnalysisResponseMapper,
  IntentionResponseMapper,
} from '../mapper';
import { RescheduleIntentionPort } from '../port/in';
import {
  INTENTION_REPOSITORY_PORT,
  IntentionRepositoryPort,
  IntentionView,
  PredictionView,
  USER_ZONE_PORT,
  UserZonePort,
} from '../port/out';
import { IntentionPredictor } from './intention-predictor.service';

/** Convicción por defecto si la predicción anterior no dejó rastro. */
const FALLBACK_LINGUISTIC_CONFIDENCE = 70;

/**
 * Mover la hora y volver a predecir. Es la acción que da sentido a la
 * recomendación: el usuario ve el número cambiar por haber hecho caso.
 *
 * Dos caminos según el estado:
 *  - BORRADOR: se cambia la hora en el sitio. Todavía no era un compromiso,
 *    así que no hay historia que conservar.
 *  - ASUMIDA: la original se cierra como RESCHEDULED y nace otra que la
 *    apunta. Editar la fecha en el mismo registro borraría que a su hora no
 *    se cumplió, que es justo lo que este producto detecta.
 */
@Injectable()
export class RescheduleIntentionService implements RescheduleIntentionPort {
  constructor(
    @Inject(INTENTION_REPOSITORY_PORT)
    private readonly intentionRepository: IntentionRepositoryPort,
    @Inject(USER_ZONE_PORT)
    private readonly userZone: UserZonePort,
    private readonly predictor: IntentionPredictor,
  ) {}

  async execute(
    id: string,
    userId: string,
    dto: RescheduleIntentionDto,
    now: Date = new Date(),
  ): Promise<RescheduleResponseDto> {
    const owner = Id.create(userId);
    const current = await this.intentionRepository.findDetail(Id.create(id));
    if (!current) throw new IntentionNotFoundException(id);

    current.intention.assertOwnedBy(owner);
    current.intention.assertReschedulable();
    RescheduleIntentionService.assertFuture(dto.scheduledAt, now);

    const zone = await this.userZone.zoneOf(owner);
    const latest: PredictionView | undefined = current.predictions[0];

    const { prediction, recommendation } = await this.predictor.predict({
      owner,
      zone,
      objective: current.intention.objective,
      category: current.intention.category,
      difficulty: current.intention.difficulty,
      scheduledAt: dto.scheduledAt,
      linguisticConfidence: RescheduleIntentionService.convictionOf(latest),
      now,
    });

    const saved = await this.persist(current, dto.scheduledAt, zone, now, {
      prediction,
      recommendation,
    });

    // Si la hora nueva es justo la que se sugirió, el consejo se siguió.
    await this.resolveSuggestion(latest, dto.scheduledAt);

    return {
      intention: saved,
      prediction: IntentionAnalysisResponseMapper.toSnapshot(
        prediction,
        recommendation,
      ),
      previousScore: latest?.commitmentScore ?? null,
    };
  }

  private async persist(
    current: IntentionView,
    scheduledAt: Date,
    zone: Zone,
    now: Date,
    result: { prediction: Prediction; recommendation: Recommendation },
  ): Promise<IntentionResponseDto> {
    const original = current.intention;

    if (original.status === IntentionStatus.DRAFT) {
      original.reschedule(scheduledAt, zone, now);
      await this.intentionRepository.rescheduleDraft(
        original,
        result.prediction,
        result.recommendation,
      );
      return this.detailOf(original.id);
    }

    const replacement = Intention.rescheduleFrom(
      original,
      Id.generate(),
      scheduledAt,
      zone,
      now,
    );
    original.close(IntentionStatus.RESCHEDULED, now);

    await this.intentionRepository.replaceWithReschedule(
      original,
      replacement,
      result.prediction,
      result.recommendation,
    );
    return this.detailOf(replacement.id);
  }

  /**
   * Marca la recomendación anterior como seguida cuando la hora elegida es
   * exactamente la que proponía. Con esto se puede medir cuántos consejos se
   * siguen, que es el dato que dice si el producto sirve.
   */
  private async resolveSuggestion(
    latest: PredictionView | undefined,
    scheduledAt: Date,
  ): Promise<void> {
    const suggested = latest?.recommendation;
    if (!suggested?.suggestedAt || suggested.accepted !== null) return;
    if (suggested.suggestedAt.getTime() !== scheduledAt.getTime()) return;

    await this.intentionRepository.resolveRecommendation(
      Id.create(suggested.id),
      true,
    );
  }

  private async detailOf(id: Id): Promise<IntentionResponseDto> {
    const view = await this.intentionRepository.findDetail(id);
    if (!view) throw new IntentionNotFoundException(id.value);
    return IntentionResponseMapper.toResponse(view);
  }

  /** La convicción del mensaje no cambia por mover la hora: se reutiliza. */
  private static convictionOf(latest: PredictionView | undefined): number {
    return (
      latest?.factors[FactorKey.LINGUISTIC_CONFIDENCE] ??
      FALLBACK_LINGUISTIC_CONFIDENCE
    );
  }

  private static assertFuture(scheduledAt: Date, now: Date): void {
    if (scheduledAt.getTime() <= now.getTime())
      throw new InvalidInputException(
        'La hora nueva tiene que estar en el futuro',
      );
  }
}
