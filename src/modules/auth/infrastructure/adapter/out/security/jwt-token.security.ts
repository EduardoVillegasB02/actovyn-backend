import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AuthPayload,
  AuthTokenPort,
} from 'src/modules/auth/application/port/out';

/** Access token corto: si se filtra, caduca solo en minutos. */
export const DEFAULT_ACCESS_TOKEN_SECONDS = 900;

@Injectable()
export class JwtTokenSecurity implements AuthTokenPort {
  readonly expiresIn: number;

  constructor(
    private readonly jwtService: JwtService,
    config: ConfigService,
  ) {
    const configured = Number(config.get<string>('JWT_EXPIRES_IN'));
    this.expiresIn =
      Number.isFinite(configured) && configured > 0
        ? configured
        : DEFAULT_ACCESS_TOKEN_SECONDS;
  }

  generate(payload: AuthPayload): Promise<string> {
    return this.jwtService.signAsync(payload, { expiresIn: this.expiresIn });
  }

  verify(token: string): Promise<AuthPayload> {
    return this.jwtService.verifyAsync<AuthPayload>(token);
  }
}
