import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { IntentionModule } from './modules/intention/intention.module';
import { UserModule } from './modules/user/user.module';
import { AuthGuard } from './modules/auth/infrastructure/adapter/in/rest/guard/auth.guard';
import { DomainExceptionFilter } from './shared/infrastructure/filter/domain-exception.filter';
import { UserThrottlerGuard } from './shared/infrastructure/guard/user-throttler.guard';
import { MINUTE_MS } from './shared/constants/time.contant';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Un único limitador general. Las rutas caras lo ajustan con @Throttle;
    // declarar aquí un segundo limitador lo aplicaría a TODAS las rutas.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: MINUTE_MS, limit: 120 }],
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    IntentionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}
