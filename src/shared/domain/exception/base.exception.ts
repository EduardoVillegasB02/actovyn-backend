/**
 * Raíz de los errores de negocio. El dominio nunca importa @nestjs/common:
 * lanza esto y el DomainExceptionFilter lo traduce a un status HTTP.
 */
export abstract class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
