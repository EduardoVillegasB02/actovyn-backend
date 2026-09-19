import { Intention as PrismaIntention } from 'generated/prisma/client';
import { Id } from 'src/shared/domain/vo';
import {
  ClosedIntention,
  Intention,
} from 'src/modules/intention/domain/entity';
import {
  CloseStatus,
  Difficulty,
  EventType,
  IntentionStatus,
} from 'src/modules/intention/domain/enum';

/** Cada forma de cerrar deja su propio evento en la traza. */
const CLOSE_EVENT: Readonly<Record<CloseStatus, EventType>> = {
  [IntentionStatus.COMPLETED]: EventType.COMPLETED,
  [IntentionStatus.FAILED]: EventType.FAILED,
  [IntentionStatus.RESCHEDULED]: EventType.RESCHEDULED,
  [IntentionStatus.CANCELLED]: EventType.CANCELLED,
};

/** Las columnas del historial que el motor necesita leer. */
export interface ClosedIntentionRow {
  category: string | null;
  difficulty: string;
  local_hour: number | null;
  status: string;
  closed_at: Date | null;
  created_at: Date;
}

export interface IntentionRow {
  id: string;
  user_id: string;
  objective: string;
  category: string | null;
  raw_message: string;
  difficulty: Difficulty;
  scheduled_at: Date | null;
  local_hour: number | null;
  weekday: number | null;
  status: IntentionStatus;
  closed_at: Date | null;
  rescheduled_from_id: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Frontera entre el dominio y el schema. Es el único archivo que sabe que las
 * columnas van en snake_case y el único que castea los enums generados por
 * Prisma a los del dominio: los valores coinciden uno a uno.
 */
export class IntentionPersistenceMapper {
  static toDomain(row: PrismaIntention): Intention {
    return Intention.reconstitute(
      Id.create(row.id),
      Id.create(row.user_id),
      row.objective,
      row.category,
      row.raw_message,
      row.difficulty as Difficulty,
      row.scheduled_at,
      row.local_hour,
      row.weekday,
      row.status as IntentionStatus,
      row.closed_at,
      row.rescheduled_from_id ? Id.create(row.rescheduled_from_id) : null,
      row.created_at,
      row.updated_at,
    );
  }

  static toPersistence(intention: Intention): IntentionRow {
    return {
      id: intention.id.value,
      user_id: intention.userId.value,
      objective: intention.objective,
      category: intention.category,
      raw_message: intention.rawMessage,
      difficulty: intention.difficulty,
      scheduled_at: intention.scheduledAt,
      local_hour: intention.localHour,
      weekday: intention.weekday,
      status: intention.status,
      closed_at: intention.closedAt,
      rescheduled_from_id: intention.rescheduledFromId?.value ?? null,
      created_at: intention.createdAt,
      updated_at: intention.updatedAt,
    };
  }

  /**
   * Fila del historial -> entidad del motor.
   *
   * local_hour nunca es null aquí porque la consulta lo excluye, y closed_at
   * cae a created_at por si algún registro antiguo se cerró sin sellar fecha.
   */
  static toClosedIntention(row: ClosedIntentionRow): ClosedIntention {
    return ClosedIntention.fromStatus(
      row.category,
      row.difficulty as Difficulty,
      row.local_hour!,
      row.status as IntentionStatus,
      row.closed_at ?? row.created_at,
    );
  }

  /** El evento de cierre lleva el mismo nombre que el estado final. */
  static toCloseEvent(status: CloseStatus): EventType {
    return CLOSE_EVENT[status];
  }
}
