import { UserResponseDto } from 'src/modules/user/application/dto';

/** Lo que devuelve cualquier entrada al sistema: registro, login o refresh. */
export class SessionResponseDto {
  user: UserResponseDto;
  accessToken: string;
  /** Segundos de vida del access token. */
  expiresIn: number;
  /** Se manda como cookie httpOnly; solo llega al body si se configura así. */
  refreshToken: string;
  refreshExpiresAt: Date;
}
