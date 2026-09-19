import { Inject, Injectable } from '@nestjs/common';
import { LogoutPort } from '../port/in/auth.port';
import {
  REFRESH_TOKEN_PORT,
  REFRESH_TOKEN_REPOSITORY_PORT,
  RefreshTokenPort,
  RefreshTokenRepositoryPort,
} from '../port/out';

@Injectable()
export class LogoutService implements LogoutPort {
  constructor(
    @Inject(REFRESH_TOKEN_PORT)
    private readonly refreshTokens: RefreshTokenPort,
    @Inject(REFRESH_TOKEN_REPOSITORY_PORT)
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
  ) {}

  /**
   * Cerrar sesión nunca falla. Si el token no existe o ya estaba revocado, el
   * resultado que le importa a quien llama es el mismo: fuera.
   */
  async execute(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;

    const stored = await this.refreshTokenRepository.findByHash(
      this.refreshTokens.hash(refreshToken),
    );
    if (!stored || stored.isRevoked) return;

    stored.revoke();
    await this.refreshTokenRepository.save(stored);
  }
}
