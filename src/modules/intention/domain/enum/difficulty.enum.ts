/** Espeja Difficulty del schema. El dominio no importa el cliente generado. */
export enum Difficulty {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export const DIFFICULTIES: readonly Difficulty[] = [
  Difficulty.LOW,
  Difficulty.MEDIUM,
  Difficulty.HIGH,
];
