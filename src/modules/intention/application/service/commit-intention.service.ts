import { Inject, Injectable } from '@nestjs/common';
import { Id } from 'src/shared/domain/vo';
import { IntentionNotFoundException } from '../../domain/exception';
import { IntentionResponseDto } from '../dto';
import { IntentionResponseMapper } from '../mapper';
import { CommitIntentionPort } from '../port/in';
import {
  INTENTION_REPOSITORY_PORT,
  IntentionRepositoryPort,
  IntentionView,
} from '../port/out';

/**
 * El botón "me comprometo". A partir de aquí la intención existe para el
 * historial, las estadísticas y lo que el motor aprende.
 */
@Injectable()
export class CommitIntentionService implements CommitIntentionPort {
  constructor(
    @Inject(INTENTION_REPOSITORY_PORT)
    private readonly intentionRepository: IntentionRepositoryPort,
  ) {}

  async execute(id: string, userId: string): Promise<IntentionResponseDto> {
    const intentionId = Id.create(id);
    const current = await this.intentionRepository.findDetail(intentionId);
    if (!current) throw new IntentionNotFoundException(id);

    current.intention.assertOwnedBy(Id.create(userId));
    // La regla de "solo un borrador se asume" vive en la entidad.
    current.intention.commit();
    await this.intentionRepository.commit(current.intention);

    await this.declineSuggestion(current);

    const view = await this.intentionRepository.findDetail(intentionId);
    if (!view) throw new IntentionNotFoundException(id);
    return IntentionResponseMapper.toResponse(view);
  }

  /**
   * Comprometerse sin mover la hora es decir que no a la sugerencia. Hace
   * falta registrarlo: sin el "no", la tasa de consejos seguidos solo contaría
   * los sí y saldría siempre del 100%.
   */
  private async declineSuggestion(current: IntentionView): Promise<void> {
    const suggested = current.predictions[0]?.recommendation;
    if (!suggested?.suggestedAt || suggested.accepted !== null) return;

    await this.intentionRepository.resolveRecommendation(
      Id.create(suggested.id),
      false,
    );
  }
}
