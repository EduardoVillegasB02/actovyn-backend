export const PASSWORD_HASHER_PORT = Symbol('PasswordHasherPort');

export interface PasswordHasherPort {
  hash(plain: string): Promise<string>;
  /** Comparación en tiempo constante contra el hash guardado. */
  compare(hash: string, plain: string): Promise<boolean>;
}
