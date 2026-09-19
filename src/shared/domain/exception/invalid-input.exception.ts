import { DomainException } from './base.exception';

/** Una regla del dominio rechazó el dato de entrada. Se traduce a HTTP 400. */
export class InvalidInputException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}
