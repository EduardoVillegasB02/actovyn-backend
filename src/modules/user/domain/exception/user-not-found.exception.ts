import { NotFoundException } from 'src/shared/domain/exception';

export class UserNotFoundException extends NotFoundException {
  constructor() {
    super('Usuario no encontrado');
  }
}
