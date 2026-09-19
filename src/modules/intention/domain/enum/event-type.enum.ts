/** Espeja EventType del schema. Traza de la vida de una intención. */
export enum EventType {
  CREATED = 'CREATED',
  PREDICTED = 'PREDICTED',
  RESCHEDULED = 'RESCHEDULED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}
