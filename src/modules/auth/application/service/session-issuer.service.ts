import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DAY_MS } from 'src/shared/constants/time.contant';
import { Id } from 'src/shared/domain/vo';
import { UserResponseMapper } from 'src/modules/user/application/mapper';
import { User } from 'src/modules/user/domain/entity';
import { RefreshToken } from '../../domain/entity';
import { SessionResponseDto } from '../dto';
import {
  AUTH_TOKEN_PORT,
  AuthTokenPort,
  REFRESH_TOKEN_PORT,
  REFRESH_TOKEN_REPOSITORY_PORT,
  RefreshTokenPort,
  RefreshTokenRepositoryPort,
} from '../port/out';

/** Días que dura un refresh token si no se configura otra cosa. */
const DEFAULT_REFRESH_DAYS = 30;

/**
 * Emite una sesión. Lo usan registro, login, invitado y refresh, para que las
 * cuatro puertas de entrada produzcan exactamente la misma respuesta.
 */
@Injectable()
export class SessionIssuer {
  constructor(
    private readonly config: ConfigService,
    @Inject(AUTH_TOKEN_PORT)
    private readonly authToken: AuthTokenPort,
    @Inject(REFRESH_TOKEN_PORT)
    private readonly refreshTokens: RefreshTokenPort,
    @Inject(REFRESH_TOKEN_REPOSITORY_PORT)
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
  ) {}

  async issue(user: User, now: Date = new Date()): Promise<SessionResponseDto> {
    const accessToken = await this.authToken.generate({
      sub: user.id.value,
      eml: user.email?.value ?? null,
      gst: user.isGuest,
    });

    const issued = this.refreshTokens.issue();
    const expiresAt = new Date(now.getTime() + this.refreshTtlMs());

    await this.refreshTokenRepository.save(
      RefreshToken.issue(Id.generate(), user.id, issued.hash, expiresAt, now),
    );

    return {
      user: UserResponseMapper.toResponse(user),
      accessToken,
      expiresIn: this.authToken.expiresIn,
      refreshToken: issued.token,
      refreshExpiresAt: expiresAt,
    };
  }

  private refreshTtlMs(): number {
    const days = Number(this.config.get<string>('AUTH_REFRESH_DAYS'));
    return (
      (Number.isFinite(days) && days > 0 ? days : DEFAULT_REFRESH_DAYS) * DAY_MS
    );
  }
}
