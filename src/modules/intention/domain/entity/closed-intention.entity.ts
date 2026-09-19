import { Difficulty, IntentionStatus } from '../enum';

/**
 * Una intención ya cerrada, reducida a lo que el motor necesita.
 * Es la unidad del historial: el perfil de comportamiento se arma con estas.
 */
export class ClosedIntention {
  private constructor(
    private readonly _category: string | null,
    private readonly _difficulty: Difficulty,
    private readonly _localHour: number,
    private readonly _completed: boolean,
    private readonly _closedAt: Date,
  ) {}

  static create(
    category: string | null,
    difficulty: Difficulty,
    localHour: number,
    completed: boolean,
    closedAt: Date,
  ): ClosedIntention {
    return new ClosedIntention(
      category,
      difficulty,
      localHour,
      completed,
      closedAt,
    );
  }

  /**
   * Solo COMPLETED cuenta como cumplido. FAILED y RESCHEDULED son no
   * cumplidos; CANCELLED no debería llegar aquí (se filtra al leer).
   */
  static fromStatus(
    category: string | null,
    difficulty: Difficulty,
    localHour: number,
    status: IntentionStatus,
    closedAt: Date,
  ): ClosedIntention {
    return new ClosedIntention(
      category,
      difficulty,
      localHour,
      status === IntentionStatus.COMPLETED,
      closedAt,
    );
  }

  get category(): string | null {
    return this._category;
  }

  get difficulty(): Difficulty {
    return this._difficulty;
  }

  /** Hora local 0-23 en la zona del usuario. */
  get localHour(): number {
    return this._localHour;
  }

  get completed(): boolean {
    return this._completed;
  }

  get closedAt(): Date {
    return this._closedAt;
  }
}
