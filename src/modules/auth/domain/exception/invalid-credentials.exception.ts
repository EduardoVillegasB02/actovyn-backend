import { UnauthorizedException } from 'src/shared/domain/exception';

/**
 * Mensaje deliberadamente genérico: distinguir "ese email no existe" de "esa
 * contraseña no es" le regala a quien prueba una lista de cuentas válidas.
 */
export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super('Credenciales inválidas');
  }
}
