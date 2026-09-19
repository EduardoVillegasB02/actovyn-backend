import { HourBand } from '../enum';

export interface HourBandDefinition {
  readonly band: HourBand;
  /** Hora local inicial, inclusive. */
  readonly from: number;
  /** Hora local final, inclusive. */
  readonly to: number;
  /** Etiqueta para el usuario. */
  readonly label: string;
}

/** Cubren las 24 horas sin huecos ni solapes. */
export const HOUR_BANDS: readonly HourBandDefinition[] = [
  { band: HourBand.MADRUGADA, from: 0, to: 5, label: '12am-6am' },
  { band: HourBand.MANANA, from: 6, to: 11, label: '6am-12pm' },
  { band: HourBand.TARDE, from: 12, to: 17, label: '12pm-6pm' },
  { band: HourBand.NOCHE, from: 18, to: 21, label: '6pm-10pm' },
  { band: HourBand.NOCTURNO, from: 22, to: 23, label: '10pm-12am' },
];
