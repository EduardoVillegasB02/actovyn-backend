import { DAY_MS } from 'src/shared/constants/time.contant';
import { Zone } from 'src/shared/util/zone.interface';
import {
  CALIBRATION_BUCKETS,
  DAYS_PER_WEEK,
  MIN_HIGHLIGHT_SAMPLE,
} from '../constant';
import { Difficulty, HourBand, IntentionStatus } from '../enum';
import { HourBandService } from './hour-band.service';

/** Una intención reducida a lo que el panel necesita. */
export interface StatsEntry {
  status: IntentionStatus;
  category: string | null;
  difficulty: Difficulty;
  localHour: number | null;
  weekday: number | null;
  createdAt: Date;
  closedAt: Date | null;
  /** Score de su última predicción. null si nunca se analizó. */
  commitmentScore: number | null;
  /** Hora que propuso la última recomendación. */
  suggestedAt: Date | null;
  /** Si el usuario siguió esa propuesta. null si no decidió. */
  recommendationAccepted: boolean | null;
}

export interface Totals {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  rescheduled: number;
  cancelled: number;
  /** 0-100 sobre las cerradas. null si no hay ninguna. */
  completionRate: number | null;
}

export interface Streak {
  current: number;
  best: number;
}

export interface RateSlice {
  total: number;
  completed: number;
  /** 0-100. null cuando no hay cerradas con las que calcularlo. */
  rate: number | null;
}

export interface BandSlice extends RateSlice {
  band: HourBand;
  label: string;
}

export interface WeekdaySlice extends RateSlice {
  weekday: number;
}

export interface CategorySlice extends RateSlice {
  category: string;
}

export interface DifficultySlice extends RateSlice {
  difficulty: Difficulty;
}

export interface TrendPoint extends RateSlice {
  /** Lunes de esa semana, en hora local. */
  weekStart: string;
}

export interface CalibrationBucket {
  bucket: string;
  n: number;
  /** Media de lo que el motor predijo en ese tramo. */
  predictedAvg: number;
  /** Lo que de verdad pasó, 0-100. */
  actualRate: number;
}

export interface RecommendationStats {
  suggested: number;
  accepted: number;
  completedWhenAccepted: number;
  completedWhenIgnored: number;
}

export interface Highlight {
  type: string;
  text: string;
}

export interface BehaviorStats {
  totals: Totals;
  streak: Streak;
  byHourBand: BandSlice[];
  byWeekday: WeekdaySlice[];
  byCategory: CategorySlice[];
  byDifficulty: DifficultySlice[];
  trend: TrendPoint[];
  calibration: CalibrationBucket[];
  recommendations: RecommendationStats;
  highlights: Highlight[];
}

const WEEKDAY_NAMES = [
  'domingos',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábados',
];

/**
 * El panel "tus patrones", calculado entero en memoria a partir de las filas
 * ya leídas. Ni una consulta aquí: por eso se puede testear con un array.
 *
 * Todo lo que mide una tasa de cumplimiento ignora lo que sigue pendiente y
 * lo cancelado. Pendiente todavía no dice nada, y cancelar a conciencia no es
 * lo mismo que fallar.
 */
export class BehaviorStatsService {
  static build(entries: StatsEntry[], zone: Zone): BehaviorStats {
    const closed = entries.filter((e) => BehaviorStatsService.isClosed(e));

    const byHourBand = BehaviorStatsService.byHourBand(closed);
    const byWeekday = BehaviorStatsService.byWeekday(closed);

    return {
      totals: BehaviorStatsService.totals(entries),
      streak: BehaviorStatsService.streak(entries, zone),
      byHourBand,
      byWeekday,
      byCategory: BehaviorStatsService.byCategory(closed),
      byDifficulty: BehaviorStatsService.byDifficulty(closed),
      trend: BehaviorStatsService.trend(closed, zone),
      calibration: BehaviorStatsService.calibration(closed),
      recommendations: BehaviorStatsService.recommendations(entries),
      highlights: BehaviorStatsService.highlights(byHourBand, byWeekday),
    };
  }

  /** Cerrada = ya se sabe qué pasó. CANCELLED no cuenta: nadie falló. */
  private static isClosed(entry: StatsEntry): boolean {
    return (
      entry.status === IntentionStatus.COMPLETED ||
      entry.status === IntentionStatus.FAILED ||
      entry.status === IntentionStatus.RESCHEDULED
    );
  }

  private static isCompleted(entry: StatsEntry): boolean {
    return entry.status === IntentionStatus.COMPLETED;
  }

  private static completedIn(rows: StatsEntry[]): number {
    return rows.filter((row) => BehaviorStatsService.isCompleted(row)).length;
  }

  /** Porcentaje entero, o null si no hay nada que dividir. */
  private static rateOf(rows: StatsEntry[]): number | null {
    if (rows.length === 0) return null;
    return Math.round(
      (BehaviorStatsService.completedIn(rows) / rows.length) * 100,
    );
  }

  private static slice(rows: StatsEntry[]): RateSlice {
    return {
      total: rows.length,
      completed: BehaviorStatsService.completedIn(rows),
      rate: BehaviorStatsService.rateOf(rows),
    };
  }

  private static totals(entries: StatsEntry[]): Totals {
    const count = (status: IntentionStatus) =>
      entries.filter((e) => e.status === status).length;

    return {
      total: entries.length,
      pending: count(IntentionStatus.PENDING),
      completed: count(IntentionStatus.COMPLETED),
      failed: count(IntentionStatus.FAILED),
      rescheduled: count(IntentionStatus.RESCHEDULED),
      cancelled: count(IntentionStatus.CANCELLED),
      completionRate: BehaviorStatsService.rateOf(
        entries.filter((e) => BehaviorStatsService.isClosed(e)),
      ),
    };
  }

  /**
   * Días seguidos con al menos una cumplida, en fechas locales.
   *
   * La racha actual admite que hoy todavía no haya nada: el día no ha
   * terminado, y cortarla a media mañana sería castigar por la hora.
   */
  private static streak(entries: StatsEntry[], zone: Zone): Streak {
    const days = [
      ...new Set(
        entries
          .filter(
            (e) => BehaviorStatsService.isCompleted(e) && e.closedAt !== null,
          )
          .map((e) => zone.dateIso(e.closedAt!)),
      ),
    ].sort();

    if (days.length === 0) return { current: 0, best: 0 };

    let best = 1;
    let run = 1;
    for (let i = 1; i < days.length; i += 1) {
      const consecutive =
        BehaviorStatsService.dayDistance(days[i - 1], days[i]) === 1;
      run = consecutive ? run + 1 : 1;
      best = Math.max(best, run);
    }

    const today = zone.dateIso(new Date());
    const sinceLast = BehaviorStatsService.dayDistance(
      days[days.length - 1],
      today,
    );
    const current = sinceLast <= 1 ? run : 0;

    return { current, best };
  }

  /** Días de calendario entre dos fechas locales 'YYYY-MM-DD'. */
  private static dayDistance(from: string, to: string): number {
    return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
  }

  private static byHourBand(closed: StatsEntry[]): BandSlice[] {
    return HourBandService.all().map(({ band, label }) => ({
      band,
      label,
      ...BehaviorStatsService.slice(
        closed.filter(
          (e) =>
            e.localHour !== null && HourBandService.of(e.localHour) === band,
        ),
      ),
    }));
  }

  private static byWeekday(closed: StatsEntry[]): WeekdaySlice[] {
    return Array.from({ length: DAYS_PER_WEEK }, (_, weekday) => ({
      weekday,
      ...BehaviorStatsService.slice(
        closed.filter((e) => e.weekday === weekday),
      ),
    }));
  }

  private static byCategory(closed: StatsEntry[]): CategorySlice[] {
    const categories = [
      ...new Set(closed.map((e) => e.category).filter((c): c is string => !!c)),
    ].sort();

    return categories
      .map((category) => ({
        category,
        ...BehaviorStatsService.slice(
          closed.filter((e) => e.category === category),
        ),
      }))
      .sort((a, b) => b.total - a.total);
  }

  private static byDifficulty(closed: StatsEntry[]): DifficultySlice[] {
    return [Difficulty.LOW, Difficulty.MEDIUM, Difficulty.HIGH].map(
      (difficulty) => ({
        difficulty,
        ...BehaviorStatsService.slice(
          closed.filter((e) => e.difficulty === difficulty),
        ),
      }),
    );
  }

  /** Una fila por semana, de la más antigua a la más reciente. */
  private static trend(closed: StatsEntry[], zone: Zone): TrendPoint[] {
    const weeks = new Map<string, StatsEntry[]>();

    for (const entry of closed) {
      const when = entry.closedAt ?? entry.createdAt;
      const week = BehaviorStatsService.weekStart(when, zone);
      const bucket = weeks.get(week);
      if (bucket) bucket.push(entry);
      else weeks.set(week, [entry]);
    }

    return [...weeks.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, rows]) => ({
        weekStart,
        ...BehaviorStatsService.slice(rows),
      }));
  }

  /** Lunes de la semana local en la que cae ese instante. */
  private static weekStart(date: Date, zone: Zone): string {
    // getUTCDay da 0 para domingo; aquí la semana empieza el lunes.
    const weekday = zone.weekday(date);
    const backToMonday = weekday === 0 ? 6 : weekday - 1;
    return zone.dateIso(zone.addDays(date, -backToMonday));
  }

  /**
   * Lo predicho frente a lo que pasó. Solo entran las cerradas que tuvieron
   * predicción: sin una de las dos mitades no hay nada que comparar.
   */
  private static calibration(closed: StatsEntry[]): CalibrationBucket[] {
    const scored = closed.filter((e) => e.commitmentScore !== null);

    return CALIBRATION_BUCKETS.map(({ label, from, to }) => {
      const rows = scored.filter(
        (e) => e.commitmentScore! >= from && e.commitmentScore! <= to,
      );
      const predicted = rows.reduce((sum, e) => sum + e.commitmentScore!, 0);

      return {
        bucket: label,
        n: rows.length,
        predictedAvg: rows.length ? Math.round(predicted / rows.length) : 0,
        actualRate: BehaviorStatsService.rateOf(rows) ?? 0,
      };
    });
  }

  /**
   * Cuántos consejos se siguieron y qué pasó después. Es el dato que dice si
   * la recomendación sirve de algo o solo suena bien.
   */
  private static recommendations(entries: StatsEntry[]): RecommendationStats {
    const withSuggestion = entries.filter((e) => e.suggestedAt !== null);
    const accepted = withSuggestion.filter(
      (e) => e.recommendationAccepted === true,
    );
    const ignored = withSuggestion.filter(
      (e) => e.recommendationAccepted === false,
    );

    return {
      suggested: withSuggestion.length,
      accepted: accepted.length,
      completedWhenAccepted: BehaviorStatsService.completedIn(accepted),
      completedWhenIgnored: BehaviorStatsService.completedIn(ignored),
    };
  }

  /** Frases listas para mostrar. Solo se afirma lo que tiene muestra. */
  private static highlights(
    byHourBand: BandSlice[],
    byWeekday: WeekdaySlice[],
  ): Highlight[] {
    const highlights: Highlight[] = [];

    const bands = byHourBand.filter(
      (b) => b.total >= MIN_HIGHLIGHT_SAMPLE && b.rate !== null,
    );
    const bestBand = [...bands].sort((a, b) => b.rate! - a.rate!)[0];
    if (bestBand)
      highlights.push({
        type: 'best_band',
        text: `Tu mejor franja es ${bestBand.label}: cumples el ${bestBand.rate}%.`,
      });

    const worstBand = [...bands].sort((a, b) => a.rate! - b.rate!)[0];
    if (worstBand && bestBand && worstBand.band !== bestBand.band)
      highlights.push({
        type: 'worst_band',
        text: `En ${worstBand.label} solo cumples el ${worstBand.rate}%.`,
      });

    const days = byWeekday.filter(
      (d) => d.total >= MIN_HIGHLIGHT_SAMPLE && d.rate !== null,
    );
    const worstDay = [...days].sort((a, b) => a.rate! - b.rate!)[0];
    if (worstDay)
      highlights.push({
        type: 'worst_weekday',
        text: `Los ${WEEKDAY_NAMES[worstDay.weekday]} cumples el ${worstDay.rate}%, tu peor día.`,
      });

    return highlights;
  }
}
