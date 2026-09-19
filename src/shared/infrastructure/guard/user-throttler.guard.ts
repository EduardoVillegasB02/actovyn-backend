import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthenticatedRequest } from 'src/modules/auth/infrastructure/adapter/in/rest/request.interface';

/**
 * Cuenta por usuario, no por dirección IP.
 *
 * Con IP, una oficina entera o una red móvil comparten cupo y se estorban;
 * y quien quiera abusar solo tiene que cambiar de salida. El usuario del
 * token es el sujeto correcto. Sin token se cae a la IP, que es lo único
 * que hay en las rutas públicas.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: AuthenticatedRequest): Promise<string> {
    return Promise.resolve(req.user?.sub ?? req.ip ?? 'anónimo');
  }
}
