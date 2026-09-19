import { Id } from 'src/shared/domain/vo';
import { Zone } from 'src/shared/util/zone.interface';

export const USER_ZONE_PORT = Symbol('UserZonePort');

/**
 * Lo único que este módulo necesita saber del usuario: en qué huso vive.
 *
 * Es un puerto propio y no una dependencia del módulo de usuarios porque el
 * contrato es exactamente este: una zona por id. Si mañana la zona se
 * dedujera del dispositivo, cambia el adaptador y nada más.
 */
export interface UserZonePort {
  zoneOf(userId: Id): Promise<Zone>;
}
