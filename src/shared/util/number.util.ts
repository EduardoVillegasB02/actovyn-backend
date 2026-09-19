/** Acota un valor al rango [min, max]. NaN cae al mínimo, nunca propaga. */
export function clamp(value: number, min = 0, max = 100): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Redondeo a un decimal. Las tasas del motor se comparan, no se acumulan. */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
