import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from 'src/shared/domain/exception';
import {
  AUTH_TOKEN_PORT,
  AuthTokenPort,
} from 'src/modules/auth/application/port/out';
import {
  IS_PUBLIC_KEY,
  OPTIONAL_AUTH_KEY,
} from '../decorator/public.decorator';
import { AuthenticatedRequest } from '../request.interface';

const BEARER = 'Bearer ';

/**
 * Guard global: todo pide token salvo lo marcado con @Public.
 *
 * Es al revés que poner @UseGuards en cada controlador a propósito: si mañana
 * alguien añade un endpoint y se olvida del guard, queda protegido igual.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH_TOKEN_PORT)
    private readonly authToken: AuthTokenPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.hasFlag(context, IS_PUBLIC_KEY)) return true;

    const optional = this.hasFlag(context, OPTIONAL_AUTH_KEY);
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = AuthGuard.bearerOf(request);

    if (!token) {
      if (optional) return true;
      throw new UnauthorizedException('Falta el token de acceso');
    }

    try {
      request.user = await this.authToken.verify(token);
    } catch {
      if (optional) return true;
      throw new UnauthorizedException('Token inválido o expirado');
    }

    return true;
  }

  private hasFlag(context: ExecutionContext, key: string): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(key, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false
    );
  }

  private static bearerOf(request: AuthenticatedRequest): string | null {
    const header = request.headers.authorization;
    if (!header?.startsWith(BEARER)) return null;
    const token = header.slice(BEARER.length).trim();
    return token || null;
  }
}
