import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/database/prisma/prisma.module';
import { UserModule } from 'src/modules/user/user.module';
import {
  GUEST_PORT,
  LOGIN_PORT,
  LOGOUT_PORT,
  REFRESH_PORT,
  REGISTER_PORT,
} from './application/port/in';
import {
  AUTH_TOKEN_PORT,
  REFRESH_TOKEN_PORT,
  REFRESH_TOKEN_REPOSITORY_PORT,
} from './application/port/out';
import {
  GuestService,
  LoginService,
  LogoutService,
  RefreshService,
  RegisterService,
  SessionIssuer,
} from './application/service';
import { AuthController } from './infrastructure/adapter/in/rest/auth.controller';
import { AuthGuard } from './infrastructure/adapter/in/rest/guard/auth.guard';
import { PrismaRefreshTokenRepository } from './infrastructure/adapter/out/persistence/repository/prisma-refresh-token.repository';
import { JwtTokenSecurity } from './infrastructure/adapter/out/security/jwt-token.security';
import { RefreshTokenSecurity } from './infrastructure/adapter/out/security/refresh-token.security';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    UserModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        // Sin secreto los tokens se pueden falsificar: mejor no arrancar.
        if (!secret)
          throw new Error('Falta JWT_SECRET en las variables de entorno');
        return { secret };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: REGISTER_PORT, useClass: RegisterService },
    { provide: LOGIN_PORT, useClass: LoginService },
    { provide: GUEST_PORT, useClass: GuestService },
    { provide: REFRESH_PORT, useClass: RefreshService },
    { provide: LOGOUT_PORT, useClass: LogoutService },
    { provide: AUTH_TOKEN_PORT, useClass: JwtTokenSecurity },
    { provide: REFRESH_TOKEN_PORT, useClass: RefreshTokenSecurity },
    {
      provide: REFRESH_TOKEN_REPOSITORY_PORT,
      useClass: PrismaRefreshTokenRepository,
    },
    SessionIssuer,
    AuthGuard,
  ],
  // El guard se registra global en AppModule y necesita el puerto del token.
  exports: [AUTH_TOKEN_PORT, AuthGuard],
})
export class AuthModule {}
