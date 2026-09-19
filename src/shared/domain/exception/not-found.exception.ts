import { DomainException } from './base.exception';

export class NotFoundException extends DomainException {
  constructor(message = 'Registro no encontrado') {
    super(message);
  }
}
