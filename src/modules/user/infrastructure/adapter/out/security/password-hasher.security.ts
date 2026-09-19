import * as argon2 from 'argon2';
import { Injectable, Logger } from '@nestjs/common';
import { PasswordHasherPort } from 'src/modules/user/application/port/out';

/**
 * argon2id con los parámetros recomendados por OWASP. Es deliberadamente
 * lento: eso es lo que hace caro probar contraseñas a lo bruto.
 */
@Injectable()
export class PasswordHasherSecurity implements PasswordHasherPort {
  private readonly logger = new Logger(PasswordHasherSecurity.name);

  private static readonly OPTIONS: argon2.HashOptions = {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  };

  hash(plain: string): Promise<string> {
    return argon2.hash(plain, PasswordHasherSecurity.OPTIONS);
  }

  async compare(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch (error) {
      // Un hash corrupto o de otro algoritmo no es un 500: es un fallo de
      // autenticación como cualquier otro.
      this.logger.warn(`No se pudo verificar el hash: ${String(error)}`);
      return false;
    }
  }
}
