import { InvalidInputException } from 'src/shared/domain/exception';
import { Id } from 'src/shared/domain/vo';

/**
 * Lo que se le dice al usuario sobre una predicción: por qué ese score y qué
 * hacer al respecto. La redacción puede venir del LLM o de las reglas del
 * dominio, pero los números que cita salen siempre del motor.
 *
 * `accepted` responde a la pregunta que da sentido al producto: cuando se
 * sugiere mover una tarea, ¿la gente hace caso, y le va mejor?
 */
export class Recommendation {
  private constructor(
    private readonly _id: Id,
    private readonly _reason: string,
    private readonly _suggestion: string,
    private readonly _suggestedAt: Date | null,
    private _accepted: boolean | null,
  ) {}

  static create(
    reason: string,
    suggestion: string,
    suggestedAt: Date | null = null,
    id: Id = Id.generate(),
  ): Recommendation {
    const cleanReason = reason.trim();
    const cleanSuggestion = suggestion.trim();
    if (!cleanReason || !cleanSuggestion)
      throw new InvalidInputException(
        'Una recomendación necesita motivo y sugerencia',
      );
    return new Recommendation(
      id,
      cleanReason,
      cleanSuggestion,
      suggestedAt,
      null,
    );
  }

  static reconstitute(
    id: Id,
    reason: string,
    suggestion: string,
    suggestedAt: Date | null,
    accepted: boolean | null,
  ): Recommendation {
    return new Recommendation(id, reason, suggestion, suggestedAt, accepted);
  }

  /** Se resuelve cuando el usuario decide: mueve la hora, o se compromete sin moverla. */
  resolve(accepted: boolean): void {
    this._accepted = accepted;
  }

  get id(): Id {
    return this._id;
  }

  get reason(): string {
    return this._reason;
  }

  get suggestion(): string {
    return this._suggestion;
  }

  /** Hora alternativa propuesta, en UTC. null si no hay una mejor. */
  get suggestedAt(): Date | null {
    return this._suggestedAt;
  }

  /** null mientras el usuario no haya decidido. */
  get accepted(): boolean | null {
    return this._accepted;
  }
}
