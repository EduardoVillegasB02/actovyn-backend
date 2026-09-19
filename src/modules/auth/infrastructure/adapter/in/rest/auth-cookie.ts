import { ConfigService } from '@nestjs/config';
import { CookieOptions, Request, Response } from 'express';
import { SessionResponseDto } from 'src/modules/auth/application/dto';

export const REFRESH_COOKIE = 'refresh_token';

/**
 * Pone y quita la cookie del refresh token.
 *
 * Va en httpOnly para que ningún script de la página pueda leerla: si un XSS
 * se cuela, se lleva como mucho un access token de 15 minutos, no la sesión
 * entera. La contrapartida es que exige mismo dominio, o SameSite=None sobre
 * HTTPS; cuando eso no es posible, AUTH_REFRESH_IN_BODY devuelve el token en
 * la respuesta y el cliente lo guarda por su cuenta.
 */
export class AuthCookie {
  constructor(private readonly config: ConfigService) {}

  /** ¿El refresh se devuelve también en el cuerpo de la respuesta? */
  get inBody(): boolean {
    return this.config.get<string>('AUTH_REFRESH_IN_BODY') === 'true';
  }

  set(response: Response, session: SessionResponseDto): void {
    response.cookie(REFRESH_COOKIE, session.refreshToken, {
      ...this.options(),
      expires: session.refreshExpiresAt,
    });
  }

  clear(response: Response): void {
    response.clearCookie(REFRESH_COOKIE, this.options());
  }

  /** De la cookie, o del cuerpo cuando el cliente lo gestiona él. */
  read(request: Request, fromBody?: string): string | undefined {
    const cookies = request.cookies as Record<string, string> | undefined;
    return cookies?.[REFRESH_COOKIE] ?? fromBody;
  }

  private options(): CookieOptions {
    const crossSite =
      this.config.get<string>('AUTH_COOKIE_CROSS_SITE') === 'true';
    return {
      httpOnly: true,
      // SameSite=None exige Secure, incluso en desarrollo.
      secure: crossSite || this.config.get<string>('NODE_ENV') === 'production',
      sameSite: crossSite ? 'none' : 'lax',
      // Raíz a propósito: el prefijo global de la API es configurable y una
      // ruta fija aquí se rompería en silencio si alguien lo cambia.
      path: '/',
    };
  }
}
