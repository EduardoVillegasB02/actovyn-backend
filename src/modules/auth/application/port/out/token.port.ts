export const AUTH_TOKEN_PORT = Symbol('AuthTokenPort');

/**
 * Lo que viaja dentro del access token. Claves cortas porque esto se manda en
 * cada petición: `sub` es el usuario, `eml` su email, `gst` si es invitado.
 */
export interface AuthPayload {
  sub: string;
  eml: string | null;
  gst: boolean;
}

export interface AuthTokenPort {
  generate(payload: AuthPayload): Promise<string>;
  verify(token: string): Promise<AuthPayload>;
  /** Vida del access token en segundos, para que el cliente sepa cuándo renovar. */
  readonly expiresIn: number;
}
