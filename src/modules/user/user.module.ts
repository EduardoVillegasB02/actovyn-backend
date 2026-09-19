import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/database/prisma/prisma.module';
import {
  FIND_USER_PORT,
  UPDATE_USER_PORT,
} from './application/port/in/user.port';
import {
  PASSWORD_HASHER_PORT,
  USER_REPOSITORY_PORT,
} from './application/port/out';
import { FindUserService, UpdateUserService } from './application/service';
import { UserController } from './infrastructure/adapter/in/rest/user.controller';
import { PrismaUserRepository } from './infrastructure/adapter/out/persistence/repository/prisma-user.repository';
import { PasswordHasherSecurity } from './infrastructure/adapter/out/security/password-hasher.security';

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [
    { provide: FIND_USER_PORT, useClass: FindUserService },
    { provide: UPDATE_USER_PORT, useClass: UpdateUserService },
    { provide: USER_REPOSITORY_PORT, useClass: PrismaUserRepository },
    { provide: PASSWORD_HASHER_PORT, useClass: PasswordHasherSecurity },
  ],
  // Auth necesita leer y crear cuentas, y comprobar contraseñas.
  exports: [USER_REPOSITORY_PORT, PASSWORD_HASHER_PORT],
})
export class UserModule {}
