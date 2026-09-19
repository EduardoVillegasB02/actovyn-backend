import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from 'src/database/prisma/prisma.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import {
  ANALYZE_INTENTION_PORT,
  CLOSE_INTENTION_PORT,
  COMMIT_INTENTION_PORT,
  DISCARD_INTENTION_PORT,
  FIND_INTENTION_PORT,
  FIND_STATS_PORT,
  RESCHEDULE_INTENTION_PORT,
} from './application/port/in';
import {
  AI_PORT,
  INTENTION_REPOSITORY_PORT,
  USER_ZONE_PORT,
} from './application/port/out';
import {
  AnalyzeIntentionService,
  CloseIntentionService,
  CommitIntentionService,
  DiscardIntentionService,
  FindIntentionService,
  FindStatsService,
  IntentionPredictor,
  PurgeDraftsService,
  RescheduleIntentionService,
} from './application/service';
import { IntentionController } from './infrastructure/adapter/in/rest/intention.controller';
import { MaintenanceController } from './infrastructure/adapter/in/rest/maintenance.controller';
import { StatsController } from './infrastructure/adapter/in/rest/stats.controller';
import { FixtureAiAdapter } from './infrastructure/adapter/out/ai/fixture-ai.adapter';
import { OpenAiAdapter } from './infrastructure/adapter/out/ai/openai-ai.adapter';
import { PrismaIntentionRepository } from './infrastructure/adapter/out/persistence/repository/prisma-intention.repository';
import { PrismaUserZoneRepository } from './infrastructure/adapter/out/persistence/repository/prisma-user-zone.repository';
import { PurgeDraftsScheduler } from './infrastructure/scheduler/purge-drafts.scheduler';
import { MaintenanceGuard } from 'src/shared/infrastructure/guard/maintenance.guard';

/**
 * ESTE ES EL PATRÓN A REPLICAR en cualquier módulo nuevo.
 *
 * La regla del cableado hexagonal:
 *   - application/port declara los símbolos y las interfaces.
 *   - infrastructure/adapter tiene las clases concretas.
 *   - el módulo conecta símbolo -> clase, y nadie más sabe cuál es cuál.
 *   - servicios y controlador inyectan con @Inject(SIMBOLO).
 *
 * Resultado: cambiar OpenAI por otro proveedor, o Prisma por lo que sea, es
 * tocar SOLO este archivo. El dominio y los casos de uso no se enteran.
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [IntentionController, StatsController, MaintenanceController],
  providers: [
    { provide: ANALYZE_INTENTION_PORT, useClass: AnalyzeIntentionService },
    { provide: COMMIT_INTENTION_PORT, useClass: CommitIntentionService },
    { provide: CLOSE_INTENTION_PORT, useClass: CloseIntentionService },
    { provide: DISCARD_INTENTION_PORT, useClass: DiscardIntentionService },
    { provide: FIND_INTENTION_PORT, useClass: FindIntentionService },
    {
      provide: RESCHEDULE_INTENTION_PORT,
      useClass: RescheduleIntentionService,
    },
    { provide: FIND_STATS_PORT, useClass: FindStatsService },
    { provide: INTENTION_REPOSITORY_PORT, useClass: PrismaIntentionRepository },
    { provide: USER_ZONE_PORT, useClass: PrismaUserZoneRepository },

    // Compartido por analizar y reprogramar: el pipeline de puntuación.
    IntentionPredictor,
    PurgeDraftsService,
    PurgeDraftsScheduler,
    MaintenanceGuard,

    FixtureAiAdapter,
    OpenAiAdapter,
    {
      provide: AI_PORT,
      // El interruptor de la demo: AI_PROVIDER=openai | fixture.
      // Si el wifi falla el domingo, se cambia la variable y todo sigue.
      useFactory: (
        config: ConfigService,
        fixture: FixtureAiAdapter,
        openai: OpenAiAdapter,
      ) => (config.get<string>('AI_PROVIDER') === 'openai' ? openai : fixture),
      inject: [ConfigService, FixtureAiAdapter, OpenAiAdapter],
    },
  ],
})
export class IntentionModule {}
