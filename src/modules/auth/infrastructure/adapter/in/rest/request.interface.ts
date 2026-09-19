import { Request } from 'express';
import { AuthPayload } from 'src/modules/auth/application/port/out';

/** La petición después de pasar por AuthGuard. */
export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}
