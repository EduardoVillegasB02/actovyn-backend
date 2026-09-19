/**
 * Lo que el sistema necesita saber de una zona horaria.
 *
 * `FixedZone` lo cumple para offsets constantes y `IanaZone` para zonas reales
 * con horario de verano. Nada de arriba sabe cuál de las dos tiene delante.
 */
export interface Zone {
  /** Nombre IANA, tal como se guarda en el perfil del usuario. */
  readonly name: string;

  /** 'YYYY-MM-DDTHH:mm[:ss]' en hora local -> instante UTC. */
  toUtc(localIso: string): Date;

  /** Instante UTC -> 'YYYY-MM-DDTHH:mm:ss' en hora local. */
  toLocalIso(date: Date): string;

  /** Instante UTC -> 'YYYY-MM-DD' en hora local. */
  dateIso(date: Date): string;

  /** Hora local, 0-23. */
  hour(date: Date): number;

  /** Día de la semana local. Convención de JavaScript: 0 = domingo. */
  weekday(date: Date): number;

  /** Suma días de calendario conservando la hora de pared. */
  addDays(date: Date, days: number): Date;
}
