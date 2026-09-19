import { InvalidInputException } from 'src/shared/domain/exception';
import { ValueObject } from 'src/shared/domain/vo';

/**
 * Solo guarda el hash. La contraseña en claro nunca entra al dominio ni
 * sobrevive a la petición que la trajo.
 */
export class Password extends ValueObject<{ value: string }> {
  static readonly MIN_LENGTH = 8;

  private constructor(value: string) {
    super({ value });
  }

  static fromHash(hash: string): Password {
    if (!hash || hash.trim().length === 0)
      throw new InvalidInputException(
        'El hash de la contraseña no puede estar vacío',
      );
    return new Password(hash);
  }

  /** Regla de fortaleza, aplicada antes de hashear. */
  static assertStrength(plain: string): void {
    if (!plain || plain.length < Password.MIN_LENGTH)
      throw new InvalidInputException(
        `La contraseña debe tener al menos ${Password.MIN_LENGTH} caracteres`,
      );
  }

  get hash(): string {
    return this.props.value;
  }
}
