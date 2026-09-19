import { HOUR_MS } from '../constants/time.contant';
import { FixedZone } from './fixed-zone.util';
import { IanaZone } from './iana-zone.util';
import { Zone } from './zone.interface';

export const LIMA_UTC_OFFSET_HOURS = -5;

/** Zona por defecto: la de quien no declara ninguna. */
export const DEFAULT_TIMEZONE = 'America/Lima';

/**
 * Perú es UTC-5 fijo, sin horario de verano, así que un offset constante
 * basta y es más barato que consultar la base de zonas.
 *
 * Regla del sistema: la base de datos guarda SIEMPRE UTC. La hora local solo
 * existe en los bordes y en local_hour / weekday, que se derivan de aquí.
 */
export const LIMA_ZONE = new FixedZone(
  DEFAULT_TIMEZONE,
  LIMA_UTC_OFFSET_HOURS,
  LIMA_UTC_OFFSET_HOURS * HOUR_MS,
);

/**
 * Construir un Intl.DateTimeFormat no es gratis y aquí se pide una vez por
 * análisis, así que las zonas ya resueltas se quedan.
 */
const cache = new Map<string, Zone>([[DEFAULT_TIMEZONE, LIMA_ZONE]]);

/**
 * Zona del usuario a partir de su `timezone`. Una zona desconocida no puede
 * tumbar una petición: se registra el caso cayendo a la de por defecto.
 */
export function resolveZone(timezone?: string | null): Zone {
  const name = timezone?.trim();
  if (!name) return LIMA_ZONE;

  const cached = cache.get(name);
  if (cached) return cached;

  if (!IanaZone.isValid(name)) return LIMA_ZONE;

  const zone = new IanaZone(name);
  cache.set(name, zone);
  return zone;
}

/** Offset en horas de una zona en ese instante. Sirve para cualquier Zone. */
export function offsetHoursAt(zone: Zone, date: Date): number {
  const asIfUtc = Date.parse(`${zone.toLocalIso(date)}Z`);
  return Math.round((asIfUtc - date.getTime()) / HOUR_MS);
}
