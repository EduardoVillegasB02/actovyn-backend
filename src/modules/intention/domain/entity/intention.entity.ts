import {
  ConflictException,
  ForbiddenException,
  InvalidInputException,
} from 'src/shared/domain/exception';
import { Id } from 'src/shared/domain/vo';
import { Zone } from 'src/shared/util/zone.interface';
import { CloseStatus, Difficulty, IntentionStatus } from '../enum';

/**
 * El compromiso del usuario y su ciclo de vida completo.
 *
 * DRAFT -> PENDING -> COMPLETED | FAILED | RESCHEDULED | CANCELLED
 *
 * Nace DRAFT: analizar es probar, y hasta que alguien pulsa "me comprometo"
 * no hay nada que contar ni de lo que aprender. Un borrador se descarta, no
 * se cierra; una intención asumida se cierra una sola vez.
 *
 * scheduled_at se guarda SIEMPRE en UTC; local_hour y weekday se derivan con
 * la zona del usuario y quedan materializados porque el motor consulta por
 * ellos en cada análisis.
 */
export class Intention {
  private constructor(
    private readonly _id: Id,
    private readonly _userId: Id,
    private readonly _objective: string,
    private readonly _category: string | null,
    private readonly _rawMessage: string,
    private readonly _difficulty: Difficulty,
    // La hora se puede mover mientras sea un borrador, y con ella hay que
    // recalcular siempre local_hour y weekday: son datos derivados.
    private _scheduledAt: Date | null,
    private _localHour: number | null,
    private _weekday: number | null,
    private _status: IntentionStatus,
    private _closedAt: Date | null,
    private readonly _rescheduledFromId: Id | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(
    id: Id,
    userId: Id,
    objective: string,
    category: string | null,
    rawMessage: string,
    difficulty: Difficulty,
    scheduledAt: Date | null,
    zone: Zone,
    now: Date = new Date(),
  ): Intention {
    const clean = objective.trim();
    if (clean.length === 0)
      throw new InvalidInputException('El objetivo no puede estar vacío');

    return new Intention(
      id,
      userId,
      clean,
      category ? category.trim().toLowerCase() : null,
      rawMessage.trim(),
      difficulty,
      scheduledAt,
      scheduledAt ? zone.hour(scheduledAt) : null,
      scheduledAt ? zone.weekday(scheduledAt) : null,
      IntentionStatus.DRAFT,
      null,
      null,
      now,
      now,
    );
  }

  static reconstitute(
    id: Id,
    userId: Id,
    objective: string,
    category: string | null,
    rawMessage: string,
    difficulty: Difficulty,
    scheduledAt: Date | null,
    localHour: number | null,
    weekday: number | null,
    status: IntentionStatus,
    closedAt: Date | null,
    rescheduledFromId: Id | null,
    createdAt: Date,
    updatedAt: Date,
  ): Intention {
    return new Intention(
      id,
      userId,
      objective,
      category,
      rawMessage,
      difficulty,
      scheduledAt,
      localHour,
      weekday,
      status,
      closedAt,
      rescheduledFromId,
      createdAt,
      updatedAt,
    );
  }

  /**
   * Mueve la hora de un borrador. Todavía no es un compromiso, así que no hay
   * historia que conservar: se cambia el dato y se vuelve a predecir.
   */
  reschedule(scheduledAt: Date, zone: Zone, now: Date = new Date()): void {
    if (this._status !== IntentionStatus.DRAFT)
      throw new ConflictException(
        'Solo un borrador cambia de hora en el sitio; lo asumido se reprograma creando otra intención',
      );
    this._scheduledAt = scheduledAt;
    this._localHour = zone.hour(scheduledAt);
    this._weekday = zone.weekday(scheduledAt);
    this._updatedAt = now;
  }

  /**
   * Reprograma un compromiso ya asumido: nace una intención nueva que apunta
   * a la original.
   *
   * La original NO se edita, se cierra como RESCHEDULED. Mover la fecha en el
   * mismo registro borraría que a su hora no se cumplió, que es justo la señal
   * de fallo blando que este producto detecta.
   */
  static rescheduleFrom(
    original: Intention,
    id: Id,
    scheduledAt: Date,
    zone: Zone,
    now: Date = new Date(),
  ): Intention {
    return new Intention(
      id,
      original._userId,
      original._objective,
      original._category,
      original._rawMessage,
      original._difficulty,
      scheduledAt,
      zone.hour(scheduledAt),
      zone.weekday(scheduledAt),
      IntentionStatus.PENDING,
      null,
      original._id,
      now,
      now,
    );
  }

  /** ¿Se puede mover la hora de esto? Solo mientras no esté cerrada. */
  assertReschedulable(): void {
    if (this.isClosed)
      throw new ConflictException(
        `Una intención ${this._status} ya no se reprograma`,
      );
  }

  /**
   * El paso de "lo analicé" a "lo voy a hacer". Solo desde aquí la intención
   * cuenta para el historial, las estadísticas y lo que aprende el motor.
   */
  commit(now: Date = new Date()): void {
    if (this._status !== IntentionStatus.DRAFT)
      throw new ConflictException(
        `Solo un borrador se puede asumir, y esta intención está ${this._status}`,
      );
    this._status = IntentionStatus.PENDING;
    this._updatedAt = now;
  }

  /** Una intención se cierra una vez. Reabrir falsearía el historial. */
  close(status: CloseStatus, now: Date = new Date()): void {
    if (this._status === IntentionStatus.DRAFT)
      throw new ConflictException(
        'Un borrador no se cierra: o se asume, o se descarta',
      );
    if (this._status !== IntentionStatus.PENDING)
      throw new ConflictException(
        `La intención ya se cerró como ${this._status}`,
      );
    this._status = status;
    this._closedAt = now;
    this._updatedAt = now;
  }

  /** Borrar solo se permite mientras no sea un compromiso. */
  assertDiscardable(): void {
    if (this._status !== IntentionStatus.DRAFT)
      throw new ConflictException(
        'Una intención asumida no se borra: se cierra como CANCELLED',
      );
  }

  /**
   * Existir no es ser visible. Sin esto, cualquiera con un id adivinado leería
   * los compromisos de otra persona.
   */
  assertOwnedBy(userId: Id): void {
    if (this._userId.value !== userId.value) throw new ForbiddenException();
  }

  get isDraft(): boolean {
    return this._status === IntentionStatus.DRAFT;
  }

  get isClosed(): boolean {
    return (
      this._status !== IntentionStatus.PENDING &&
      this._status !== IntentionStatus.DRAFT
    );
  }

  get id(): Id {
    return this._id;
  }

  get userId(): Id {
    return this._userId;
  }

  get objective(): string {
    return this._objective;
  }

  get category(): string | null {
    return this._category;
  }

  get rawMessage(): string {
    return this._rawMessage;
  }

  get difficulty(): Difficulty {
    return this._difficulty;
  }

  get scheduledAt(): Date | null {
    return this._scheduledAt;
  }

  get localHour(): number | null {
    return this._localHour;
  }

  get weekday(): number | null {
    return this._weekday;
  }

  get status(): IntentionStatus {
    return this._status;
  }

  get closedAt(): Date | null {
    return this._closedAt;
  }

  /** La intención de la que esta salió al reprogramarse. */
  get rescheduledFromId(): Id | null {
    return this._rescheduledFromId;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
