import { StatsResponseDto } from 'src/modules/intention/application/dto';

/** Contrato HTTP del panel, en snake_case como el resto de la API. */
export interface RateSliceHttp {
  total: number;
  completed: number;
  rate: number | null;
}

export interface StatsHttpResponse {
  period: { from: Date; to: Date };
  totals: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
    rescheduled: number;
    cancelled: number;
    completion_rate: number | null;
  };
  streak: { current: number; best: number };
  by_hour_band: (RateSliceHttp & { band: string; label: string })[];
  by_weekday: (RateSliceHttp & { weekday: number })[];
  by_category: (RateSliceHttp & { category: string })[];
  by_difficulty: (RateSliceHttp & { difficulty: string })[];
  trend: (RateSliceHttp & { week_start: string })[];
  calibration: {
    bucket: string;
    n: number;
    predicted_avg: number;
    actual_rate: number;
  }[];
  recommendations: {
    suggested: number;
    accepted: number;
    completed_when_accepted: number;
    completed_when_ignored: number;
  };
  highlights: { type: string; text: string }[];
}

export class StatsHttpMapper {
  static toHttp(dto: StatsResponseDto): StatsHttpResponse {
    const { stats } = dto;
    const rate = (slice: RateSliceHttp): RateSliceHttp => ({
      total: slice.total,
      completed: slice.completed,
      rate: slice.rate,
    });

    return {
      period: { from: dto.period.from, to: dto.period.to },
      totals: {
        total: stats.totals.total,
        pending: stats.totals.pending,
        completed: stats.totals.completed,
        failed: stats.totals.failed,
        rescheduled: stats.totals.rescheduled,
        cancelled: stats.totals.cancelled,
        completion_rate: stats.totals.completionRate,
      },
      streak: stats.streak,
      by_hour_band: stats.byHourBand.map((b) => ({
        band: b.band,
        label: b.label,
        ...rate(b),
      })),
      by_weekday: stats.byWeekday.map((d) => ({
        weekday: d.weekday,
        ...rate(d),
      })),
      by_category: stats.byCategory.map((c) => ({
        category: c.category,
        ...rate(c),
      })),
      by_difficulty: stats.byDifficulty.map((d) => ({
        difficulty: d.difficulty,
        ...rate(d),
      })),
      trend: stats.trend.map((t) => ({
        week_start: t.weekStart,
        ...rate(t),
      })),
      calibration: stats.calibration.map((c) => ({
        bucket: c.bucket,
        n: c.n,
        predicted_avg: c.predictedAvg,
        actual_rate: c.actualRate,
      })),
      recommendations: {
        suggested: stats.recommendations.suggested,
        accepted: stats.recommendations.accepted,
        completed_when_accepted: stats.recommendations.completedWhenAccepted,
        completed_when_ignored: stats.recommendations.completedWhenIgnored,
      },
      highlights: stats.highlights,
    };
  }
}
