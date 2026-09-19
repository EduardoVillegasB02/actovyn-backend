import { DAY_MS, LOCAL_ISO } from '../constants/time.contant';
import { Zone } from './zone.interface';

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Zona horaria real, resuelta con la base de datos de zonas que ya trae Node.
 *
 * Existe porque el producto dejó de asumir Lima: un usuario en Madrid o en
 * Santiago cambia de offset dos veces al año, y si eso no se respeta el motor
 * aprende franjas horarias equivocadas.
 */
export class IanaZone implements Zone {
  private readonly formatter: Intl.DateTimeFormat;

  constructor(readonly name: string) {
    if (!IanaZone.isValid(name))
      throw new RangeError(`Zona horaria desconocida: ${name}`);

    this.formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: name,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      // h23 evita que la medianoche salga como "24" según la versión de ICU.
      hourCycle: 'h23',
    });
  }

  static isValid(name: string): boolean {
    if (!name || !name.trim()) return false;
    try {
      new Intl.DateTimeFormat('en-CA', { timeZone: name });
      return true;
    } catch {
      return false;
    }
  }

  toUtc(localIso: string): Date {
    const match = LOCAL_ISO.exec(localIso.trim());
    if (!match)
      throw new RangeError(
        `Fecha local inválida (esperaba YYYY-MM-DDTHH:mm:ss): ${localIso}`,
      );

    const [, y, mo, d, h, mi, s = '00'] = match;
    const asIfUtc = Date.UTC(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s),
    );

    // Se parte del offset vigente alrededor de esa fecha y se corrige una vez.
    // Dos pasadas bastan: el error inicial nunca supera el salto de horario,
    // que es de una hora.
    const approx = new Date(asIfUtc - this.offsetMs(new Date(asIfUtc)));
    const date = new Date(asIfUtc - this.offsetMs(approx));

    // Si el round-trip no coincide, esa hora local no existe: o la fecha es
    // irreal, o cae en el salto de primavera.
    if (this.toLocalIso(date) !== `${y}-${mo}-${d}T${h}:${mi}:${s}`)
      throw new RangeError(`Fecha local fuera de rango: ${localIso}`);

    return date;
  }

  toLocalIso(date: Date): string {
    const l = this.parts(date);
    const day = IanaZone.formatDate(l);
    const time = [l.hour, l.minute, l.second]
      .map((n) => IanaZone.pad(n))
      .join(':');
    return `${day}T${time}`;
  }

  dateIso(date: Date): string {
    return IanaZone.formatDate(this.parts(date));
  }

  hour(date: Date): number {
    return this.parts(date).hour;
  }

  weekday(date: Date): number {
    const { year, month, day } = this.parts(date);
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  }

  /**
   * Suma días conservando la hora de pared. Cruzar un cambio de horario
   * mueve el instante 23 o 25 horas, no 24, que es lo que espera cualquiera
   * que dijo "mañana a las 7".
   */
  addDays(date: Date, days: number): Date {
    const naive = new Date(date.getTime() + days * DAY_MS);
    const drift = this.offsetMs(date) - this.offsetMs(naive);
    return new Date(naive.getTime() + drift);
  }

  /** Offset de la zona en ese instante, en milisegundos. */
  private offsetMs(date: Date): number {
    const l = this.parts(date);
    const asIfUtc = Date.UTC(
      l.year,
      l.month - 1,
      l.day,
      l.hour,
      l.minute,
      l.second,
    );
    // Las partes llegan con resolución de segundo: se compara contra el
    // instante truncado para no arrastrar milisegundos al offset.
    return asIfUtc - Math.floor(date.getTime() / 1000) * 1000;
  }

  private parts(date: Date): LocalParts {
    const found = this.formatter.formatToParts(date);
    const value = (type: Intl.DateTimeFormatPartTypes): number =>
      Number(found.find((part) => part.type === type)?.value);

    return {
      year: value('year'),
      month: value('month'),
      day: value('day'),
      hour: value('hour'),
      minute: value('minute'),
      second: value('second'),
    };
  }

  private static formatDate(l: LocalParts): string {
    const year = IanaZone.pad(l.year, 4);
    const month = IanaZone.pad(l.month);
    const day = IanaZone.pad(l.day);
    return `${year}-${month}-${day}`;
  }

  private static pad(n: number, width = 2): string {
    return String(n).padStart(width, '0');
  }
}
