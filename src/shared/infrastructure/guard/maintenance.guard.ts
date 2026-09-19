import { timingSafeEqual } from 'node:crypto';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { ForbiddenException } from 'src/shared/domain/exception';

export const MAINTENANCE_HEADER = 'x-maintenance-token';

/**
 * Deja pasar solo a quien traiga el token de mantenimiento.
 *
 * Es para tareas que dispara una máquina, no una persona: no hay usuario, así
 * que no sirve el token de sesión. Sin MAINTENANCE_TOKEN configurado el
 * endpoint queda cerrado, que es lo que debe pasar por defecto.
 */
@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('MAINTENANCE_TOKEN');
    if (!expected) throw new ForbiddenException('Mantenimiento no habilitado');

    const request = context.switchToHttp().getRequest<Request>();
    const received = request.headers[MAINTENANCE_HEADER];

    if (
      typeof received !== 'string' ||
      !MaintenanceGuard.matches(expected, received)
    )
      throw new ForbiddenException('Token de mantenimiento inválido');

    return true;
  }

  /** Comparación de tiempo constante: comparar con === filtra el secreto. */
  private static matches(expected: string, received: string): boolean {
    const a = Buffer.from(expected);
    const b = Buffer.from(received);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
