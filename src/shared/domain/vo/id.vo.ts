import { v4 as uuid, validate as isUuid } from 'uuid';
import { ValueObject } from './base.vo';

export class Id extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  static create(value: string): Id {
    if (!value || value.trim().length === 0)
      throw new Error('El ID no puede estar vacío');
    if (!isUuid(value)) throw new Error('El ID debe ser un UUID válido');
    return new Id(value);
  }

  static generate(): Id {
    return new Id(uuid());
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
