/** Espeja IntentionStatus del schema. */
export enum IntentionStatus {
  /**
   * Analizada pero no asumida. Nace así a propósito: analizar es probar, y
   * probar no puede ensuciar el historial del que aprende el motor.
   */
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RESCHEDULED = 'RESCHEDULED',
  CANCELLED = 'CANCELLED',
}

/** Los estados con los que se cierra una intención ya asumida. */
export type CloseStatus =
  | IntentionStatus.COMPLETED
  | IntentionStatus.FAILED
  | IntentionStatus.RESCHEDULED
  | IntentionStatus.CANCELLED;

export const CLOSE_STATUSES: readonly CloseStatus[] = [
  IntentionStatus.COMPLETED,
  IntentionStatus.FAILED,
  IntentionStatus.RESCHEDULED,
  IntentionStatus.CANCELLED,
];

/** Todos los estados que el cliente puede pedir al filtrar el historial. */
export const FILTERABLE_STATUSES: readonly IntentionStatus[] = [
  IntentionStatus.PENDING,
  ...CLOSE_STATUSES,
];

/**
 * Qué entra al historial de comportamiento.
 *
 * RESCHEDULED cuenta como no cumplido: patear una tarea ES la señal de fallo
 * blando que este producto detecta. CANCELLED queda fuera, porque cancelar un
 * plan a conciencia no es lo mismo que fallarlo. DRAFT tampoco: nunca llegó a
 * ser un compromiso.
 */
export const COUNTED_IN_HISTORY: readonly CloseStatus[] = [
  IntentionStatus.COMPLETED,
  IntentionStatus.FAILED,
  IntentionStatus.RESCHEDULED,
];
