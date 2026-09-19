import { Inject, Injectable } from '@nestjs/common';
import { Id } from 'src/shared/domain/vo';
import { IntentionNotFoundException } from '../../domain/exception';
import { DiscardIntentionPort } from '../port/in';
import {
  INTENTION_REPOSITORY_PORT,
  IntentionRepositoryPort,
} from '../port/out';

/**
 * El botón "descartar". Solo actúa sobre borradores; lo ya asumido se cierra
 * como CANCELLED, porque haber cancelado también es información.
 */
@Injectable()
export class DiscardIntentionService implements DiscardIntentionPort {
  constructor(
    @Inject(INTENTION_REPOSITORY_PORT)
    private readonly intentionRepository: IntentionRepositoryPort,
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const intentionId = Id.create(id);
    const intention = await this.intentionRepository.findById(intentionId);
    if (!intention) throw new IntentionNotFoundException(id);

    intention.assertOwnedBy(Id.create(userId));
    intention.assertDiscardable();
    await this.intentionRepository.delete(intentionId);
  }
}
