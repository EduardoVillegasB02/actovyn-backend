import { DAY_MS, LOCAL_ISO } from '../constants/time.contant';

export class FixedZone {
  constructor(
    readonly name: string,
    readonly offsetHours: number,
    private readonly offsetMs: number,
  ) {}

  /* Zona horaria de offset */
  toUtc(localIso: string): Date {
    const m = LOCAL_ISO.exec(localIso.trim());
    if (!m)
      throw new RangeError(
        `Fecha local inválida (esperaba YYYY-MM-DDTHH:mm:ss): ${localIso}`,
      );
    const [, y, mo, d, h, mi, s = '00'] = m;
    // Date.UTC normaliza valores fuera de rango (30 feb -> 2 mar, 25:00 -> día siguiente).
    const asIfUtc = Date.UTC(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s),
    );
    const date = new Date(asIfUtc - this.offsetMs);
    if (this.toLocalIso(date) !== `${y}-${mo}-${d}T${h}:${mi}:${s}`)
      throw new RangeError(`Fecha local fuera de rango: ${localIso}`);
    return date;
  }

  /* local YYYY-MM-DDTHH:mm:ss */
  toLocalIso(date: Date): string {
    const l = this.shift(date);
    const time = [l.getUTCHours(), l.getUTCMinutes(), l.getUTCSeconds()]
      .map((n) => FixedZone.pad(n))
      .join(':');
    return `${FixedZone.formatDate(l)}T${time}`;
  }

  /* local YYYY-MM-DD */
  dateIso(date: Date): string {
    return FixedZone.formatDate(this.shift(date));
  }

  /* Hora local 0-23 */
  hour(date: Date): number {
    return this.shift(date).getUTCHours();
  }

  /* Día de la semana local */
  weekday(date: Date): number {
    return this.shift(date).getUTCDay();
  }

  /* Suma días calendario. Con offset fijo un día siempre dura 24 h */
  addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * DAY_MS);
  }

  /* Desplaza el instante para que sus componentes UTC sean los locales */
  private shift(date: Date): Date {
    return new Date(date.getTime() + this.offsetMs);
  }

  private static formatDate(l: Date): string {
    const year = FixedZone.pad(l.getUTCFullYear(), 4);
    const month = FixedZone.pad(l.getUTCMonth() + 1);
    const day = FixedZone.pad(l.getUTCDate());
    return `${year}-${month}-${day}`;
  }

  private static pad(n: number, width: number = 2): string {
    return String(n).padStart(width, '0');
  }
}
