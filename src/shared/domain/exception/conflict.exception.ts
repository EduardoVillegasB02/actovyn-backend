import { DomainException } from './base.exception';

/**
 * El recurso existe pero está en un estado que no admite la operación:
 * cerrar dos veces, comprometer algo que ya no es borrador. Se traduce a 409.
 */
export class ConflictException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}
