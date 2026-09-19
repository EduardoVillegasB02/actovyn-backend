import { Inject, Injectable } from '@nestjs/common';
import { DAY_MS } from 'src/shared/constants/time.contant';
import { InvalidInputException } from 'src/shared/domain/exception';
import { Id } from 'src/shared/domain/vo';
import { DAYS_PER_WEEK, DEFAULT_STATS_WEEKS } from '../../domain/constant';
import { BehaviorStatsService } from '../../domain/service';
import { FindStatsDto, StatsResponseDto } from '../dto';
import { FindStatsPort } from '../port/in';
import {
  INTENTION_REPOSITORY_PORT,
  IntentionRepositoryPort,
  StatsPeriod,
  USER_ZONE_PORT,
  UserZonePort,
} from '../port/out';

/**
 * El panel "tus patrones". Todo se agrega en el servidor a propósito: hacerlo
 * en el cliente obligaría a bajarse el historial entero en cada visita.
 */
@Injectable()
export class FindStatsService implements FindStatsPort {
  constructor(
    @Inject(INTENTION_REPOSITORY_PORT)
    private readonly intentionRepository: IntentionRepositoryPort,
    @Inject(USER_ZONE_PORT)
    private readonly userZone: UserZonePort,
  ) {}

  async execute(
    userId: string,
    dto: FindStatsDto,
    now: Date = new Date(),
  ): Promise<StatsResponseDto> {
    const owner = Id.create(userId);
    const period = FindStatsService.periodOf(dto, now);

    const [zone, entries] = await Promise.all([
      this.userZone.zoneOf(owner),
      this.intentionRepository.findForStats(owner, period),
    ]);

    return { period, stats: BehaviorStatsService.build(entries, zone) };
  }

  /** Sin rango, las últimas 12 semanas. */
  private static periodOf(dto: FindStatsDto, now: Date): StatsPeriod {
    const to = dto.to ?? now;
    const from =
      dto.from ??
      new Date(to.getTime() - DEFAULT_STATS_WEEKS * DAYS_PER_WEEK * DAY_MS);

    if (from.getTime() > to.getTime())
      throw new InvalidInputException(
        'El inicio del periodo no puede ser posterior al final',
      );

    return { from, to };
  }
}
