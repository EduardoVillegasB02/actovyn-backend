import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  IssuedToken,
  RefreshTokenPort,
} from 'src/modules/auth/application/port/out';

/** 256 bits de aleatoriedad: no hay nada que adivinar. */
const TOKEN_BYTES = 32;

/**
 * Token opaco, no un JWT: al no llevar información dentro, revocarlo es
 * borrar una fila, y eso es justo lo que un JWT no permite.
 *
 * Se guarda su SHA-256. No hace falta un hash lento como argon2 porque el
 * token no es una contraseña: ya tiene toda la entropía que se le puede pedir,
 * y un atacante con la tabla no tiene diccionario con el que probar.
 */
@Injectable()
export class RefreshTokenSecurity implements RefreshTokenPort {
  issue(): IssuedToken {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    return { token, hash: this.hash(token) };
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
