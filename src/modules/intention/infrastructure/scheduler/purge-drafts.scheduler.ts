import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PurgeDraftsService } from 'src/modules/intention/application/service';

/**
 * Solo pone el reloj. La decisión de qué se borra vive en el servicio, que
 * así se puede probar sin esperar a que salte una hora.
 */
@Injectable()
export class PurgeDraftsScheduler {
  constructor(private readonly purgeDrafts: PurgeDraftsService) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'purge-drafts' })
  async handle(): Promise<void> {
    await this.purgeDrafts.execute();
  }
}
