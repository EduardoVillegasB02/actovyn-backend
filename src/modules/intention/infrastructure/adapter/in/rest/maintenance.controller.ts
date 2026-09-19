import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { Public } from 'src/modules/auth/infrastructure/adapter/in/rest/decorator/public.decorator';
import { MaintenanceGuard } from 'src/shared/infrastructure/guard/maintenance.guard';
import { PurgeDraftsService } from 'src/modules/intention/application/service';

/**
 * La misma limpieza que hace el cron interno, disparable desde fuera.
 *
 * Existe porque en un plan gratuito la instancia se duerme, y un proceso
 * dormido no ejecuta su propio cron: los borradores se acumularían para
 * siempre. Con esto, un cron externo la despierta y la limpia de paso.
 *
 * @Public porque quien llama es una máquina sin sesión; el MaintenanceGuard
 * es el que decide, con un token aparte.
 */
@ApiExcludeController()
@Controller('maintenance')
@Public()
@UseGuards(MaintenanceGuard)
export class MaintenanceController {
  constructor(private readonly purgeDrafts: PurgeDraftsService) {}

  @Post('purge-drafts')
  @ApiOperation({ summary: 'Borra los borradores caducados' })
  async purge(): Promise<{ removed: number }> {
    return { removed: await this.purgeDrafts.execute() };
  }
}
