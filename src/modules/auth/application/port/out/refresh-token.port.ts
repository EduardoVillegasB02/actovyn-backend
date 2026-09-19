import { Id } from 'src/shared/domain/vo';
import { RefreshToken } from '../../../domain/entity';

export const REFRESH_TOKEN_PORT = Symbol('RefreshTokenPort');
export const REFRESH_TOKEN_REPOSITORY_PORT = Symbol(
  'RefreshTokenRepositoryPort',
);

export interface IssuedToken {
  /** El secreto que se le entrega al cliente. No se guarda en ningún sitio. */
  token: string;
  /** Lo único que sí se guarda. */
  hash: string;
}

export interface RefreshTokenPort {
  issue(): IssuedToken;
  hash(token: string): string;
}

export interface RefreshTokenRepositoryPort {
  save(token: RefreshToken): Promise<void>;
  findByHash(hash: string): Promise<RefreshToken | null>;
  /** Corta todas las sesiones del usuario: logout global o robo detectado. */
  revokeAllForUser(userId: Id, now: Date): Promise<void>;
}
