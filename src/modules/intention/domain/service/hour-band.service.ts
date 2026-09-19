import { InvalidInputException } from 'src/shared/domain/exception';
import { HOUR_BANDS, HourBandDefinition } from '../constant';
import { HourBand } from '../enum';

/** Catálogo de franjas. Único lugar que traduce una hora a una franja. */
export class HourBandService {
  static all(): readonly HourBandDefinition[] {
    return HOUR_BANDS;
  }

  /** Franja de una hora local 0-23. */
  static of(hour: number): HourBand {
    const found = HOUR_BANDS.find((b) => hour >= b.from && hour <= b.to);
    if (!found) throw new InvalidInputException(`Hora fuera de rango: ${hour}`);
    return found.band;
  }

  static definition(band: HourBand): HourBandDefinition {
    const found = HOUR_BANDS.find((b) => b.band === band);
    if (!found) throw new InvalidInputException(`Franja desconocida: ${band}`);
    return found;
  }

  static label(band: HourBand): string {
    return HourBandService.definition(band).label;
  }

  /** Hora concreta que representa a la franja: su punto medio. */
  static midHour(band: HourBand): number {
    const { from, to } = HourBandService.definition(band);
    return Math.floor((from + to) / 2);
  }
}
