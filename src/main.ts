import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

/**
 * Orígenes permitidos, separados por comas en CORS_ORIGINS.
 *
 * Con credentials:true no vale el comodín: el navegador rechaza una respuesta
 * que diga "cualquier origen" y a la vez lleve cookies. Sin la variable se
 * asume desarrollo local.
 */
const DEFAULT_ORIGINS = ['http://localhost:3000', 'http://localhost:3001'];

function corsOrigins(config: ConfigService): string[] {
  const configured = config.get<string>('CORS_ORIGINS');
  if (!configured) return DEFAULT_ORIGINS;
  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'log', 'verbose', 'warn'],
  });
  const config = app.get(ConfigService);

  // El refresh token viaja en una cookie httpOnly y hay que saber leerla.
  app.use(cookieParser());

  app.enableCors({
    origin: corsOrigins(config),
    methods: 'GET, HEAD, PUT, PATCH, POST, DELETE',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.setGlobalPrefix('api');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('HackEdu API')
    .setDescription(
      'Agente de compromisos: detecta, predice y recomienda. El score es una regla propia y auditable, no una salida del LLM.',
    )
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    // El JSON del contrato: con él se generan los tipos del cliente.
    jsonDocumentUrl: 'api/docs-json',
  });

  // 0.0.0.0 y no localhost: dentro de un contenedor, escuchar solo en la
  // interfaz local deja la app invisible para el balanceador del proveedor.
  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.verbose(`Servidor corriendo exitosamente en /api (puerto ${port})`);
  logger.verbose('Documentación Swagger en /api/docs');
}

void bootstrap();
