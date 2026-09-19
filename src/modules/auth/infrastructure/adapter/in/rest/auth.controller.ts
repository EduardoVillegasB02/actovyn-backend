import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import {
  GuestDto,
  LoginDto,
  SessionResponseDto,
} from 'src/modules/auth/application/dto';
import { RefreshHttpDto } from './dto/refresh-http.dto';
import { RegisterHttpDto } from './dto/register-http.dto';
import {
  GUEST_PORT,
  GuestPort,
  LOGIN_PORT,
  LOGOUT_PORT,
  LoginPort,
  LogoutPort,
  REFRESH_PORT,
  REGISTER_PORT,
  RefreshPort,
  RegisterPort,
} from 'src/modules/auth/application/port/in';
import { AuthPayload } from 'src/modules/auth/application/port/out';
import { AuthCookie } from './auth-cookie';
import { CurrentUser } from './decorator/current-user.decorator';
import { OptionalAuth, Public } from './decorator/public.decorator';
import { AuthHttpMapper, SessionHttpResponse } from './mapper/auth-http.mapper';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly cookie: AuthCookie;

  constructor(
    config: ConfigService,
    @Inject(REGISTER_PORT) private readonly register: RegisterPort,
    @Inject(LOGIN_PORT) private readonly login: LoginPort,
    @Inject(GUEST_PORT) private readonly guest: GuestPort,
    @Inject(REFRESH_PORT) private readonly refresh: RefreshPort,
    @Inject(LOGOUT_PORT) private readonly logout: LogoutPort,
  ) {
    this.cookie = new AuthCookie(config);
  }

  // OptionalAuth y no Public: sin token entra igual, pero si viene uno el
  // guard lo resuelve, que es como se detecta al invitado que se registra.
  @Post('register')
  @OptionalAuth()
  @ApiOperation({
    summary:
      'Crea la cuenta. Con un token de invitado, convierte esa cuenta en vez de crear otra',
  })
  async registerUser(
    @Body() dto: RegisterHttpDto,
    @Res({ passthrough: true }) response: Response,
    @CurrentUser() current?: AuthPayload,
  ): Promise<SessionHttpResponse> {
    const guestId = current?.gst ? current.sub : undefined;
    return this.respond(
      await this.register.execute(dto.toApplication(), guestId),
      response,
    );
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicia sesión con email y contraseña' })
  async loginUser(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionHttpResponse> {
    return this.respond(await this.login.execute(dto), response);
  }

  @Post('guest')
  @Public()
  @ApiOperation({ summary: 'Cuenta anónima para probar sin formulario' })
  async guestUser(
    @Body() dto: GuestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionHttpResponse> {
    return this.respond(await this.guest.execute(dto), response);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rota el refresh y devuelve un access token nuevo' })
  async refreshSession(
    @Body() dto: RefreshHttpDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionHttpResponse> {
    const token = this.cookie.read(request, dto.refresh_token) ?? '';
    return this.respond(await this.refresh.execute(token), response);
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Invalida el refresh y limpia la cookie' })
  async logoutUser(
    @Body() dto: RefreshHttpDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.logout.execute(this.cookie.read(request, dto.refresh_token));
    this.cookie.clear(response);
  }

  private respond(
    session: SessionResponseDto,
    response: Response,
  ): SessionHttpResponse {
    this.cookie.set(response, session);
    return AuthHttpMapper.toHttp(session, this.cookie.inBody);
  }
}
