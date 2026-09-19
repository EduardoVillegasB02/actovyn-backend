import { SessionResponseDto } from 'src/modules/auth/application/dto';
import {
  UserHttpMapper,
  UserHttpResponse,
} from 'src/modules/user/infrastructure/adapter/in/rest/mapper/user-http.mapper';

export interface SessionHttpResponse {
  user: UserHttpResponse;
  access_token: string;
  expires_in: number;
  /**
   * Normalmente ausente: el refresh viaja en una cookie httpOnly que el
   * JavaScript de la página no puede leer. Solo aparece cuando se configura
   * el modo sin cookie.
   */
  refresh_token?: string;
}

export class AuthHttpMapper {
  static toHttp(
    session: SessionResponseDto,
    includeRefreshToken: boolean,
  ): SessionHttpResponse {
    const body: SessionHttpResponse = {
      user: UserHttpMapper.toHttp(session.user),
      access_token: session.accessToken,
      expires_in: session.expiresIn,
    };
    if (includeRefreshToken) body.refresh_token = session.refreshToken;
    return body;
  }
}
