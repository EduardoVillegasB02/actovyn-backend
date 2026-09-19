import { ConflictException } from 'src/shared/domain/exception';

export class EmailAlreadyExistsException extends ConflictException {
  constructor() {
    super('Ya existe una cuenta con ese email');
  }
}
