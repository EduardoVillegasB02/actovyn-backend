import { UserResponseDto } from 'src/modules/user/application/dto';

/**
 * Contrato HTTP en snake_case, como el resto de la API.
 *
 * Se mandan los tres: `name` y `lastname` son lo que guarda la cuenta, y
 * `display_name` es la línea ya compuesta, para que el cliente no tenga que
 * decidir cómo unirlos.
 */
export interface UserHttpResponse {
  id: string;
  email: string | null;
  name: string;
  lastname: string;
  display_name: string;
  timezone: string;
  is_guest: boolean;
  created_at: Date;
}

export class UserHttpMapper {
  static toHttp(dto: UserResponseDto): UserHttpResponse {
    return {
      id: dto.id,
      email: dto.email,
      name: dto.name,
      lastname: dto.lastname,
      display_name: dto.displayName,
      timezone: dto.timezone,
      is_guest: dto.isGuest,
      created_at: dto.createdAt,
    };
  }
}
