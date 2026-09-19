import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ConflictException,
  DomainException,
  ForbiddenException,
  InvalidInputException,
  NotFoundException,
  UnauthorizedException,
} from '../../domain/exception';

/**
 * Único punto donde un error de negocio se convierte en respuesta HTTP.
 * Gracias a esto el dominio no conoce Nest y los servicios de aplicación no
 * tienen que traducir excepciones a mano.
 */
@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter<DomainException> {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: DomainException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.statusOf(exception);

    // Un 5xx es un fallo nuestro y merece traza; un 4xx es el cliente.
    if (status >= 500) {
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      error: exception.name,
      message: exception.message,
    });
  }

  private statusOf(exception: DomainException): number {
    // Del más concreto al más general: NotFound extiende DomainException
    // igual que los demás, así que el orden aquí es el contrato.
    if (exception instanceof UnauthorizedException)
      return HttpStatus.UNAUTHORIZED;
    if (exception instanceof ForbiddenException) return HttpStatus.FORBIDDEN;
    if (exception instanceof NotFoundException) return HttpStatus.NOT_FOUND;
    if (exception instanceof ConflictException) return HttpStatus.CONFLICT;
    if (exception instanceof InvalidInputException)
      return HttpStatus.BAD_REQUEST;
    return HttpStatus.UNPROCESSABLE_ENTITY;
  }
}
