import { Inject, Injectable, Logger } from '@nestjs/common';
import { DAY_MS } from 'src/shared/constants/time.contant';
import {
  INTENTION_REPOSITORY_PORT,
  IntentionRepositoryPort,
} from '../port/out';

/** Cuánto sobrevive un borrador que nadie asumió ni descartó. */
export const DRAFT_TTL_MS = DAY_MS;

/**
 * Analizar diez veces para ver qué pasa es un uso legítimo, y deja diez
 * borradores. Esto los recoge para que la tabla no crezca por probar.
 */
@Injectable()
export class PurgeDraftsService {
  private readonly logger = new Logger(PurgeDraftsService.name);

  constructor(
    @Inject(INTENTION_REPOSITORY_PORT)
    private readonly intentionRepository: IntentionRepositoryPort,
  ) {}

  async execute(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - DRAFT_TTL_MS);
    const removed =
      await this.intentionRepository.deleteDraftsOlderThan(cutoff);

    if (removed > 0)
      this.logger.log(`Borradores caducados eliminados: ${removed}`);
    return removed;
  }
}
