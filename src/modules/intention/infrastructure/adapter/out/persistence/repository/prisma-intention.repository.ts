import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Id } from 'src/shared/domain/vo';
import {
  ClosedIntention,
  Intention,
  Prediction,
  Recommendation,
} from 'src/modules/intention/domain/entity';
import {
  CloseStatus,
  COUNTED_IN_HISTORY,
  Difficulty,
  EventType,
  FILTERABLE_STATUSES,
  IntentionStatus,
} from 'src/modules/intention/domain/enum';
import {
  HISTORY_LIMIT,
  STATS_LIMIT,
} from 'src/modules/intention/domain/constant';
import { StatsEntry } from 'src/modules/intention/domain/service';
import {
  IntentionFilter,
  IntentionPage,
  IntentionRepositoryPort,
  IntentionView,
  StatsPeriod,
} from 'src/modules/intention/application/port/out';
import {
  IntentionPersistenceMapper,
  PredictionPersistenceMapper,
} from '../mapper';
import { IntentionCursor } from './intention-cursor';

/** Predicciones ordenadas de la más reciente a la más antigua. */
const PREDICTIONS_DESC = {
  orderBy: { created_at: 'desc' },
  include: { recommendation: true },
} as const;

@Injectable()
export class PrismaIntentionRepository implements IntentionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Una sola consulta, filas planas y el cálculo en memoria. Con 30 o con
   * 3.000 registros por usuario esto sobra. Cuando deje de sobrar se cambia
   * por agregaciones en SQL sin tocar una línea del dominio.
   */
  async findClosedHistory(userId: Id): Promise<ClosedIntention[]> {
    const rows = await this.prisma.intention.findMany({
      where: {
        user_id: userId.value,
        // COUNTED_IN_HISTORY deja fuera los borradores y lo cancelado.
        status: { in: [...COUNTED_IN_HISTORY] },
        // Sin hora local no hay nada que decir sobre franjas horarias.
        local_hour: { not: null },
      },
      select: {
        category: true,
        difficulty: true,
        local_hour: true,
        status: true,
        closed_at: true,
        created_at: true,
      },
      orderBy: { closed_at: 'desc' },
      take: HISTORY_LIMIT,
    });

    return rows.map((row) => IntentionPersistenceMapper.toClosedIntention(row));
  }

  /** Todo o nada: si falla la predicción no queda una intención huérfana. */
  async saveAnalysis(
    intention: Intention,
    prediction: Prediction,
    recommendation: Recommendation,
  ): Promise<void> {
    const data = IntentionPersistenceMapper.toPersistence(intention);

    await this.prisma.$transaction(async (tx) => {
      await tx.intention.create({
        data: {
          ...data,
          events: {
            create: {
              type: EventType.CREATED,
              occurred_at: intention.createdAt,
              metadata: { source: 'analyze' },
            },
          },
        },
      });

      await PrismaIntentionRepository.createPrediction(
        tx,
        intention.id,
        prediction,
        recommendation,
      );
    });
  }

  /**
   * Predicción, su recomendación y el evento que la deja en la traza. Lo
   * comparten analizar y las dos formas de reprogramar, para que una
   * predicción nunca quede sin su rastro.
   */
  private static async createPrediction(
    tx: Prisma.TransactionClient,
    intentionId: Id,
    prediction: Prediction,
    recommendation: Recommendation,
  ): Promise<void> {
    await tx.prediction.create({
      data: {
        ...PredictionPersistenceMapper.toPersistence(prediction),
        intention_id: intentionId.value,
        recommendation: {
          create:
            PredictionPersistenceMapper.recommendationToPersistence(
              recommendation,
            ),
        },
      },
    });

    await tx.intentionEvent.create({
      data: {
        intention_id: intentionId.value,
        type: EventType.PREDICTED,
        metadata: {
          score: prediction.commitmentScore,
          risk: prediction.risk,
          capped_by: [...prediction.cappedBy],
        },
      },
    });
  }

  async findById(id: Id): Promise<Intention | null> {
    const row = await this.prisma.intention.findUnique({
      where: { id: id.value },
    });
    return row ? IntentionPersistenceMapper.toDomain(row) : null;
  }

  async findDetail(id: Id): Promise<IntentionView | null> {
    const row = await this.prisma.intention.findUnique({
      where: { id: id.value },
      include: { predictions: PREDICTIONS_DESC },
    });
    if (!row) return null;

    const { predictions, ...intention } = row;
    return {
      intention: IntentionPersistenceMapper.toDomain(intention),
      predictions: predictions.map((prediction) =>
        PredictionPersistenceMapper.toView(prediction),
      ),
    };
  }

  async commit(intention: Intention): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.intention.update({
        where: { id: intention.id.value },
        data: {
          status: IntentionStatus.PENDING,
          updated_at: intention.updatedAt,
        },
      }),
      this.prisma.intentionEvent.create({
        data: {
          intention_id: intention.id.value,
          type: EventType.CREATED,
          occurred_at: intention.updatedAt,
          metadata: { source: 'commit' },
        },
      }),
    ]);
  }

  async close(intention: Intention): Promise<void> {
    const status = intention.status as CloseStatus;

    await this.prisma.$transaction([
      this.prisma.intention.update({
        where: { id: intention.id.value },
        data: {
          status,
          closed_at: intention.closedAt,
          updated_at: intention.updatedAt,
        },
      }),
      this.prisma.intentionEvent.create({
        data: {
          intention_id: intention.id.value,
          type: IntentionPersistenceMapper.toCloseEvent(status),
          occurred_at: intention.closedAt ?? new Date(),
          metadata: { source: 'close' },
        },
      }),
    ]);
  }

  async delete(id: Id): Promise<void> {
    // La cascada del schema se lleva predicción, recomendación y eventos.
    await this.prisma.intention.delete({ where: { id: id.value } });
  }

  /** Un borrador cambia de hora en el sitio y acumula otra predicción. */
  async rescheduleDraft(
    intention: Intention,
    prediction: Prediction,
    recommendation: Recommendation,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.intention.update({
        where: { id: intention.id.value },
        data: {
          scheduled_at: intention.scheduledAt,
          local_hour: intention.localHour,
          weekday: intention.weekday,
          updated_at: intention.updatedAt,
        },
      });

      await PrismaIntentionRepository.createPrediction(
        tx,
        intention.id,
        prediction,
        recommendation,
      );

      await tx.intentionEvent.create({
        data: {
          intention_id: intention.id.value,
          type: EventType.RESCHEDULED,
          occurred_at: intention.updatedAt,
          metadata: { source: 'reschedule', scope: 'draft' },
        },
      });
    });
  }

  /**
   * Un compromiso asumido no se edita: la original se cierra como RESCHEDULED
   * y nace otra que la apunta. Todo en una transacción, porque a medias
   * quedarían dos pendientes para la misma cosa.
   */
  async replaceWithReschedule(
    original: Intention,
    replacement: Intention,
    prediction: Prediction,
    recommendation: Recommendation,
  ): Promise<void> {
    const data = IntentionPersistenceMapper.toPersistence(replacement);

    await this.prisma.$transaction(async (tx) => {
      await tx.intention.update({
        where: { id: original.id.value },
        data: {
          status: IntentionStatus.RESCHEDULED,
          closed_at: original.closedAt,
          updated_at: original.updatedAt,
        },
      });

      await tx.intentionEvent.create({
        data: {
          intention_id: original.id.value,
          type: EventType.RESCHEDULED,
          occurred_at: original.closedAt ?? replacement.createdAt,
          metadata: { source: 'reschedule', replaced_by: data.id },
        },
      });

      await tx.intention.create({
        data: {
          ...data,
          events: {
            create: {
              type: EventType.CREATED,
              occurred_at: replacement.createdAt,
              metadata: { source: 'reschedule', replaces: original.id.value },
            },
          },
        },
      });

      await PrismaIntentionRepository.createPrediction(
        tx,
        replacement.id,
        prediction,
        recommendation,
      );
    });
  }

  async resolveRecommendation(id: Id, accepted: boolean): Promise<void> {
    await this.prisma.recommendation.update({
      where: { id: id.value },
      data: { accepted },
    });
  }

  /**
   * Filas planas del periodo: el panel se arma después en memoria, igual que
   * el motor. Así toda la agregación es dominio puro y se testea sin base de
   * datos; cuando el volumen lo pida, se sustituye por SQL sin tocarla.
   *
   * El periodo se mide por created_at, es decir por cuándo se asumió el
   * compromiso, porque es la única fecha que todas tienen.
   */
  async findForStats(userId: Id, period: StatsPeriod): Promise<StatsEntry[]> {
    const rows = await this.prisma.intention.findMany({
      where: {
        user_id: userId.value,
        // Un borrador nunca fue un compromiso: no cuenta en el panel.
        status: { not: IntentionStatus.DRAFT },
        created_at: { gte: period.from, lte: period.to },
      },
      select: {
        status: true,
        category: true,
        difficulty: true,
        local_hour: true,
        weekday: true,
        created_at: true,
        closed_at: true,
        predictions: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: {
            commitment_score: true,
            recommendation: {
              select: { suggested_at: true, accepted: true },
            },
          },
        },
      },
      orderBy: { created_at: 'asc' },
      take: STATS_LIMIT,
    });

    return rows.map((row) => {
      const latest = row.predictions[0];
      return {
        status: row.status as IntentionStatus,
        category: row.category,
        difficulty: row.difficulty as Difficulty,
        localHour: row.local_hour,
        weekday: row.weekday,
        createdAt: row.created_at,
        closedAt: row.closed_at,
        commitmentScore: latest?.commitment_score ?? null,
        suggestedAt: latest?.recommendation?.suggested_at ?? null,
        recommendationAccepted: latest?.recommendation?.accepted ?? null,
      };
    });
  }

  async deleteDraftsOlderThan(cutoff: Date): Promise<number> {
    const { count } = await this.prisma.intention.deleteMany({
      where: {
        status: IntentionStatus.DRAFT,
        created_at: { lt: cutoff },
      },
    });
    return count;
  }

  /**
   * Paginación por cursor y no por offset: con scroll infinito, un OFFSET
   * grande hace que la base recorra todo lo anterior en cada página, y si
   * entra una fila nueva arriba se repiten o se saltan resultados.
   */
  async findPage(userId: Id, filter: IntentionFilter): Promise<IntentionPage> {
    const where = this.whereOf(userId, filter);
    const cursorId = IntentionCursor.decode(filter.cursor);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.intention.findMany({
        where,
        orderBy: this.orderOf(filter),
        include: { predictions: { ...PREDICTIONS_DESC, take: 1 } },
        // Una fila de más: así se sabe si hay página siguiente sin contar.
        take: filter.limit + 1,
        ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      }),
      this.prisma.intention.count({ where }),
    ]);

    const hasMore = rows.length > filter.limit;
    const page = hasMore ? rows.slice(0, filter.limit) : rows;

    return {
      items: page.map(({ predictions, ...intention }) => ({
        intention: IntentionPersistenceMapper.toDomain(intention),
        predictions: predictions.map((prediction) =>
          PredictionPersistenceMapper.toView(prediction),
        ),
      })),
      nextCursor: hasMore
        ? IntentionCursor.encode(page[page.length - 1].id)
        : null,
      total,
    };
  }

  private whereOf(
    userId: Id,
    filter: IntentionFilter,
  ): Prisma.IntentionWhereInput {
    const statuses = filter.statuses.length
      ? filter.statuses
      : filter.includeDrafts
        ? [IntentionStatus.DRAFT, ...FILTERABLE_STATUSES]
        : [...FILTERABLE_STATUSES];

    const scheduledAt: Prisma.DateTimeNullableFilter = {};
    if (filter.from) scheduledAt.gte = filter.from;
    if (filter.to) scheduledAt.lte = filter.to;
    if (filter.scheduledBefore) scheduledAt.lt = filter.scheduledBefore;

    return {
      user_id: userId.value,
      status: { in: statuses },
      ...(Object.keys(scheduledAt).length ? { scheduled_at: scheduledAt } : {}),
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.query
        ? { objective: { contains: filter.query, mode: 'insensitive' } }
        : {}),
    };
  }

  /**
   * El id va siempre de segundo criterio: sin un desempate estable, dos filas
   * con la misma fecha podrían salir en distinto orden en cada consulta y el
   * cursor perdería el sitio.
   */
  private orderOf(
    filter: IntentionFilter,
  ): Prisma.IntentionOrderByWithRelationInput[] {
    const field =
      filter.sort === 'scheduled_at'
        ? { scheduled_at: { sort: filter.order, nulls: 'last' as const } }
        : { created_at: filter.order };
    return [field, { id: filter.order }];
  }
}
