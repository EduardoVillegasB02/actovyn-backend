import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'auth:public';

/** Deja el endpoint fuera del guard global: las puertas de entrada. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const OPTIONAL_AUTH_KEY = 'auth:optional';

/**
 * El endpoint funciona con y sin token, y aprovecha el token si llega.
 * Lo usa el registro para detectar que quien se registra venía de invitado.
 */
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH_KEY, true);
