import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from 'src/modules/user/application/port/out';
import { InvalidRefreshTokenException } from '../../domain/exception';
import { SessionResponseDto } from '../dto';
import { RefreshPort } from '../port/in/auth.port';
import {
  REFRESH_TOKEN_PORT,
  REFRESH_TOKEN_REPOSITORY_PORT,
  RefreshTokenPort,
  RefreshTokenRepositoryPort,
} from '../port/out';
import { SessionIssuer } from './session-issuer.service';

@Injectable()
export class RefreshService implements RefreshPort {
  private readonly logger = new Logger(RefreshService.name);

  constructor(
    @Inject(REFRESH_TOKEN_PORT)
    private readonly refreshTokens: RefreshTokenPort,
    @Inject(REFRESH_TOKEN_REPOSITORY_PORT)
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    private readonly sessions: SessionIssuer,
  ) {}

  async execute(refreshToken: string): Promise<SessionResponseDto> {
    if (!refreshToken) throw new InvalidRefreshTokenException();

    const now = new Date();
    const stored = await this.refreshTokenRepository.findByHash(
      this.refreshTokens.hash(refreshToken),
    );
    if (!stored) throw new InvalidRefreshTokenException();

    // Un token ya usado que vuelve a aparecer significa que alguien se quedó
    // con una copia. No se sabe cuál de los dos es el legítimo, así que se
    // cortan todas las sesiones y ambos vuelven a entrar.
    if (stored.isRevoked) {
      this.logger.warn(
        `Refresh token reutilizado del usuario ${stored.userId.value}: revoco sus sesiones`,
      );
      await this.refreshTokenRepository.revokeAllForUser(stored.userId, now);
      throw new InvalidRefreshTokenException();
    }

    if (stored.isExpired(now)) throw new InvalidRefreshTokenException();

    const user = await this.userRepository.findById(stored.userId);
    if (!user) throw new InvalidRefreshTokenException();

    // Rotación: el token que acaba de usarse no vuelve a servir.
    stored.revoke(now);
    await this.refreshTokenRepository.save(stored);

    return this.sessions.issue(user, now);
  }
}
