import { BehaviorStats } from '../../domain/service';

export class StatsPeriodDto {
  from: Date;
  to: Date;
}

/** El panel completo: el periodo que cubre, y lo que dice de él. */
export class StatsResponseDto {
  period: StatsPeriodDto;
  stats: BehaviorStats;
}

/** Rango pedido, ya normalizado. */
export class FindStatsDto {
  from: Date | null;
  to: Date | null;
}
