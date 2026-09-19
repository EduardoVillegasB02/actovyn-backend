import { DomainException } from './base.exception';

/** El recurso existe y es de otra persona. Se traduce a 403. */
export class ForbiddenException extends DomainException {
  constructor(message = 'No tienes acceso a este recurso') {
    super(message);
  }
}
