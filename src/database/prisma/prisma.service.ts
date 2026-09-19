import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'generated/prisma/client';

type PoolConfig = ConstructorParameters<typeof PrismaPg>[0];

/** Una base local no lleva TLS; cualquier proveedor gestionado sí. */
const LOCAL_HOST = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private static readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ adapter: new PrismaPg(PrismaService.poolConfig()) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Supabase, Neon y compañía solo aceptan conexiones cifradas, así que el
   * TLS se activa solo salvo que la base sea local.
   *
   * Por defecto no se verifica la cadena del certificado: los poolers
   * gestionados presentan certificados que no encadenan con el almacén de
   * confianza del sistema, y sin esto la conexión falla. El tráfico va
   * cifrado igual. Si quieres verificación completa, pon el certificado del
   * proveedor en DATABASE_CA_CERT y se usa.
   */
  private static poolConfig(): PoolConfig {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString)
      throw new Error('Falta DATABASE_URL en las variables de entorno');

    if (LOCAL_HOST.test(connectionString)) return { connectionString };

    const ca = process.env.DATABASE_CA_CERT;
    if (!ca)
      PrismaService.logger.warn(
        'Conexión cifrada sin verificar el certificado. Define DATABASE_CA_CERT para verificarlo.',
      );

    return {
      connectionString,
      ssl: ca
        ? { ca, rejectUnauthorized: true }
        : { rejectUnauthorized: false },
    };
  }
}
