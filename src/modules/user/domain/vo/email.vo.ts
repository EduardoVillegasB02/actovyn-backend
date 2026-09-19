import { InvalidInputException } from 'src/shared/domain/exception';
import { ValueObject } from 'src/shared/domain/vo';

export class Email extends ValueObject<{ value: string }> {
  private static readonly PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly MAX_LENGTH = 254;

  private constructor(value: string) {
    super({ value });
  }

  /** Normaliza a minúsculas: el email es único sin importar cómo se escriba. */
  static create(value: string): Email {
    const normalized = (value ?? '').trim().toLowerCase();
    if (normalized.length > Email.MAX_LENGTH)
      throw new InvalidInputException('El email es demasiado largo');
    if (!Email.PATTERN.test(normalized))
      throw new InvalidInputException('El email no tiene un formato válido');
    return new Email(normalized);
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
