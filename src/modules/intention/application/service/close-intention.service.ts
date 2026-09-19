import { Inject, Injectable } from '@nestjs/common';
import { Id } from 'src/shared/domain/vo';
import { IntentionNotFoundException } from '../../domain/exception';
import { CloseIntentionDto, IntentionResponseDto } from '../dto';
import { IntentionResponseMapper } from '../mapper';
import { CloseIntentionPort } from '../port/in';
import {
  INTENTION_REPOSITORY_PORT,
  IntentionRepositoryPort,
} from '../port/out';

@Injectable()
export class CloseIntentionService implements CloseIntentionPort {
  constructor(
    @Inject(INTENTION_REPOSITORY_PORT)
    private readonly intentionRepository: IntentionRepositoryPort,
  ) {}

  async execute(
    id: string,
    userId: string,
    dto: CloseIntentionDto,
  ): Promise<IntentionResponseDto> {
    const intentionId = Id.create(id);
    const intention = await this.intentionRepository.findById(intentionId);
    if (!intention) throw new IntentionNotFoundException(id);

    intention.assertOwnedBy(Id.create(userId));
    // "Se cierra una sola vez" y "un borrador no se cierra" son de la entidad.
    intention.close(dto.status);
    await this.intentionRepository.close(intention);

    const view = await this.intentionRepository.findDetail(intentionId);
    if (!view) throw new IntentionNotFoundException(id);
    return IntentionResponseMapper.toResponse(view);
  }
}
