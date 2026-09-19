import { UnauthorizedException } from 'src/shared/domain/exception';

export class InvalidRefreshTokenException extends UnauthorizedException {
  constructor() {
    super('La sesión expiró, vuelve a iniciar sesión');
  }
}
