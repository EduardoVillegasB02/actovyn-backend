import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Id } from 'src/shared/domain/vo';
import { resolveZone } from 'src/shared/util/zone.util';
import { Zone } from 'src/shared/util/zone.interface';
import { UserZonePort } from 'src/modules/intention/application/port/out';

/**
 * Lee una sola columna del usuario. No pasa por el módulo de usuarios a
 * propósito: el contrato que este módulo necesita es una zona por id, y
 * arrastrar la entidad entera acoplaría dos módulos por un dato.
 */
@Injectable()
export class PrismaUserZoneRepository implements UserZonePort {
  constructor(private readonly prisma: PrismaService) {}

  async zoneOf(userId: Id): Promise<Zone> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId.value },
      select: { timezone: true },
    });
    // Una zona ausente o desconocida cae a la de por defecto en resolveZone.
    return resolveZone(row?.timezone);
  }
}
