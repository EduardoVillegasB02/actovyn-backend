import { DomainException } from './base.exception';

/** Falta identidad o no es válida. Se traduce a 401. */
export class UnauthorizedException extends DomainException {
  constructor(message = 'No autenticado') {
    super(message);
  }
}
