import { GuestDto, LoginDto, RegisterDto, SessionResponseDto } from '../../dto';

export interface RegisterPort {
  /**
   * `guestUserId` llega cuando quien se registra ya venía usando el producto
   * como invitado: en ese caso la cuenta se convierte y conserva su historial.
   */
  execute(dto: RegisterDto, guestUserId?: string): Promise<SessionResponseDto>;
}

export interface LoginPort {
  execute(dto: LoginDto): Promise<SessionResponseDto>;
}

export interface GuestPort {
  execute(dto: GuestDto): Promise<SessionResponseDto>;
}

export interface RefreshPort {
  execute(refreshToken: string): Promise<SessionResponseDto>;
}

export interface LogoutPort {
  execute(refreshToken?: string): Promise<void>;
}

export const REGISTER_PORT = Symbol('RegisterPort');
export const LOGIN_PORT = Symbol('LoginPort');
export const GUEST_PORT = Symbol('GuestPort');
export const REFRESH_PORT = Symbol('RefreshPort');
export const LOGOUT_PORT = Symbol('LogoutPort');
