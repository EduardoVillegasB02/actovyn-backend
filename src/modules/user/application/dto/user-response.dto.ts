export class UserResponseDto {
  id: string;
  /** null en cuentas de invitado. */
  email: string | null;
  name: string;
  lastname: string;
  /** Nombre y apellido en una línea, para pintar directo. */
  displayName: string;
  timezone: string;
  isGuest: boolean;
  createdAt: Date;
}
