import { InvalidInputException } from 'src/shared/domain/exception';
import { ValueObject } from 'src/shared/domain/vo';
import { DEFAULT_TIMEZONE, resolveZone } from 'src/shared/util/zone.util';
import { IanaZone } from 'src/shared/util/iana-zone.util';
import { Zone } from 'src/shared/util/zone.interface';

/**
 * Zona horaria del usuario, en nomenclatura IANA.
 *
 * Se valida al entrar y no al usarse: si aquí se cuela una zona inventada,
 * cada análisis posterior calcularía la hora local mal y el motor aprendería
 * franjas que el usuario nunca vivió.
 */
export class Timezone extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  static create(value: string): Timezone {
    const name = (value ?? '').trim();
    if (!IanaZone.isValid(name))
      throw new InvalidInputException(
        `La zona horaria "${value}" no es un identificador IANA válido`,
      );
    return new Timezone(name);
  }

  static default(): Timezone {
    return new Timezone(DEFAULT_TIMEZONE);
  }

  get value(): string {
    return this.props.value;
  }

  /** La zona lista para calcular, resuelta y cacheada. */
  get zone(): Zone {
    return resolveZone(this.props.value);
  }

  toString(): string {
    return this.props.value;
  }
}
