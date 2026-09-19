/**
 * Espeja ConfidenceLevel del schema. Mide cuánto historial respalda al score,
 * no qué tan alto es: un 90 con confianza LOW sigue siendo una conjetura.
 */
export enum ConfidenceLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}
