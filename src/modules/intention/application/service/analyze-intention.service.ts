import { Inject, Injectable, Logger } from '@nestjs/common';
import { Id } from 'src/shared/domain/vo';
import { Zone } from 'src/shared/util/zone.interface';
import { Intention } from '../../domain/entity';
import { AnalyzeIntentionDto, IntentionAnalysisResponseDto } from '../dto';
import { IntentionAnalysisResponseMapper } from '../mapper';
import { AnalyzeIntentionPort } from '../port/in';
import {
  AI_PORT,
  AiPort,
  INTENTION_REPOSITORY_PORT,
  IntentDraft,
  IntentionRepositoryPort,
  USER_ZONE_PORT,
  UserZonePort,
} from '../port/out';
import { IntentionPredictor } from './intention-predictor.service';

/**
 * ORQUESTACIÓN. No calcula nada: pide, compone y guarda.
 * Todo el cálculo vive en el dominio y se testea sin base de datos ni red.
 *
 * Lo que sale de aquí nace como BORRADOR. Analizar es probar, y probar no
 * puede ensuciar el historial del que aprende el motor: el compromiso llega
 * cuando el usuario pulsa "me comprometo".
 */
@Injectable()
export class AnalyzeIntentionService implements AnalyzeIntentionPort {
  private readonly logger = new Logger(AnalyzeIntentionService.name);

  constructor(
    @Inject(AI_PORT)
    private readonly ai: AiPort,
    @Inject(INTENTION_REPOSITORY_PORT)
    private readonly intentionRepository: IntentionRepositoryPort,
    @Inject(USER_ZONE_PORT)
    private readonly userZone: UserZonePort,
    private readonly predictor: IntentionPredictor,
  ) {}

  async execute(
    dto: AnalyzeIntentionDto,
    userId: string,
    now: Date = new Date(),
  ): Promise<IntentionAnalysisResponseDto> {
    const owner = Id.create(userId);
    // Todo lo local se calcula en la zona del usuario, no en la del servidor.
    const zone = await this.userZone.zoneOf(owner);

    // Texto libre -> estructura. Aquí el LLM aporta de verdad.
    const draft = await this.ai.analyze(dto.message, now);
    const scheduledAt = this.toInstant(draft.scheduledAtLocal, zone);

    const { prediction, recommendation } = await this.predictor.predict({
      owner,
      zone,
      objective: draft.objective,
      category: draft.category,
      difficulty: draft.difficulty,
      scheduledAt,
      linguisticConfidence: draft.linguisticConfidence,
      now,
    });

    const intention = this.toIntention(
      draft,
      dto.message,
      owner,
      scheduledAt,
      zone,
      now,
    );
    await this.intentionRepository.saveAnalysis(
      intention,
      prediction,
      recommendation,
    );

    return IntentionAnalysisResponseMapper.toResponse(
      intention,
      prediction,
      recommendation,
    );
  }

  /**
   * Una hora local que no existe (la que se salta el cambio de horario, o una
   * fecha inventada por el modelo) no puede tumbar el análisis: se sigue sin
   * hora, que es exactamente lo que el motor ya sabe manejar.
   */
  private toInstant(localIso: string | null, zone: Zone): Date | null {
    if (!localIso) return null;
    try {
      return zone.toUtc(localIso);
    } catch (error) {
      this.logger.warn(
        `Hora local inusable (${localIso}) en ${zone.name}, sigo sin hora: ${String(error)}`,
      );
      return null;
    }
  }

  private toIntention(
    draft: IntentDraft,
    rawMessage: string,
    owner: Id,
    scheduledAt: Date | null,
    zone: Zone,
    now: Date,
  ): Intention {
    return Intention.create(
      Id.generate(),
      owner,
      draft.objective,
      draft.category,
      rawMessage,
      draft.difficulty,
      scheduledAt,
      zone,
      now,
    );
  }
}
