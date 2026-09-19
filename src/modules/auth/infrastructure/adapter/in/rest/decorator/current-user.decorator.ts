import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthPayload } from 'src/modules/auth/application/port/out';
import { AuthenticatedRequest } from '../request.interface';

/** El usuario que salió del token. Sin token vale undefined. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthPayload | undefined =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
