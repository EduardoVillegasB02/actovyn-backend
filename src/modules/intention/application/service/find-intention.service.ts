import { Inject, Injectable } from '@nestjs/common';
import { Id } from 'src/shared/domain/vo';
import { IntentionNotFoundException } from '../../domain/exception';
import {
  FindIntentionsDto,
  IntentionPageResponseDto,
  IntentionResponseDto,
} from '../dto';
import { IntentionResponseMapper } from '../mapper';
import { FindIntentionPort } from '../port/in';
import {
  INTENTION_REPOSITORY_PORT,
  IntentionRepositoryPort,
} from '../port/out';

@Injectable()
export class FindIntentionService implements FindIntentionPort {
  constructor(
    @Inject(INTENTION_REPOSITORY_PORT)
    private readonly intentionRepository: IntentionRepositoryPort,
  ) {}

  /** Historial paginado: pestañas por estado, buscador y check-in. */
  async findPage(
    userId: string,
    dto: FindIntentionsDto,
  ): Promise<IntentionPageResponseDto> {
    const page = await this.intentionRepository.findPage(
      Id.create(userId),
      dto,
    );
    return IntentionResponseMapper.toPageResponse(page);
  }

  /** Detalle con todas sus predicciones: la historia completa de una tarea. */
  async findById(id: string, userId: string): Promise<IntentionResponseDto> {
    const view = await this.intentionRepository.findDetail(Id.create(id));
    if (!view) throw new IntentionNotFoundException(id);

    view.intention.assertOwnedBy(Id.create(userId));
    return IntentionResponseMapper.toResponse(view);
  }
}
