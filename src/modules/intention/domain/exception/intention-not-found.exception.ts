import { NotFoundException } from 'src/shared/domain/exception';

export class IntentionNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`La intención ${id} no existe`);
  }
}
