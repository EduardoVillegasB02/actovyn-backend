/**
 * El panel es lo que se enseña en la presentación, así que lo que afirme tiene
 * que salir de los datos. Aquí se fija qué cuenta y qué no.
 */
import { LIMA_ZONE } from 'src/shared/util/zone.util';
import { Difficulty, HourBand, IntentionStatus } from '../enum';
import { BehaviorStatsService, StatsEntry } from './behavior-stats.service';

const { COMPLETED, FAILED, PENDING, CANCELLED, RESCHEDULED } = IntentionStatus;

/** Un instante UTC a partir de una hora local de Lima. */
const at = (localIso: string) => LIMA_ZONE.toUtc(localIso);

const entry = (over: Partial<StatsEntry> = {}): StatsEntry => ({
  status: COMPLETED,
  category: 'trabajo',
  difficulty: Difficulty.MEDIUM,
  localHour: 19,
  weekday: 1,
  createdAt: at('2026-09-01T10:00:00'),
  closedAt: at('2026-09-01T19:00:00'),
  commitmentScore: 70,
  suggestedAt: null,
  recommendationAccepted: null,
  ...over,
});

const build = (entries: StatsEntry[]) =>
  BehaviorStatsService.build(entries, LIMA_ZONE);

describe('BehaviorStatsService', () => {
  describe('totales', () => {
    it('cuenta cada estado por separado', () => {
      const { totals } = build([
        entry({ status: COMPLETED }),
        entry({ status: COMPLETED }),
        entry({ status: FAILED }),
        entry({ status: PENDING, closedAt: null }),
        entry({ status: CANCELLED }),
        entry({ status: RESCHEDULED }),
      ]);

      expect(totals.total).toBe(6);
      expect(totals.completed).toBe(2);
      expect(totals.failed).toBe(1);
      expect(totals.pending).toBe(1);
      expect(totals.cancelled).toBe(1);
      expect(totals.rescheduled).toBe(1);
    });

    it('la tasa ignora lo pendiente y lo cancelado', () => {
      const { totals } = build([
        entry({ status: COMPLETED }),
        entry({ status: FAILED }),
        // Ninguna de estas dos entra en el divisor.
        entry({ status: PENDING, closedAt: null }),
        entry({ status: CANCELLED }),
      ]);

      // 1 de 2 cerradas que cuentan.
      expect(totals.completionRate).toBe(50);
    });

    it('sin nada cerrado la tasa es null, no un cero engañoso', () => {
      const { totals } = build([entry({ status: PENDING, closedAt: null })]);
      expect(totals.completionRate).toBeNull();
    });
  });

  describe('racha', () => {
    const completedOn = (day: string) =>
      entry({ status: COMPLETED, closedAt: at(`${day}T20:00:00`) });

    it('cuenta días seguidos, no intenciones', () => {
      const { streak } = build([
        completedOn('2026-01-05'),
        completedOn('2026-01-05'),
        completedOn('2026-01-06'),
        completedOn('2026-01-07'),
      ]);
      expect(streak.best).toBe(3);
    });

    it('un hueco corta la racha', () => {
      const { streak } = build([
        completedOn('2026-01-01'),
        completedOn('2026-01-02'),
        completedOn('2026-01-05'),
      ]);
      expect(streak.best).toBe(2);
    });

    it('una racha vieja no cuenta como actual', () => {
      const { streak } = build([completedOn('2026-01-01')]);
      expect(streak.best).toBe(1);
      expect(streak.current).toBe(0);
    });

    it('sin nada cumplido la racha es cero', () => {
      const { streak } = build([entry({ status: FAILED })]);
      expect(streak).toEqual({ current: 0, best: 0 });
    });
  });

  describe('cortes', () => {
    it('agrupa por franja con las mismas franjas del motor', () => {
      const { byHourBand } = build([
        entry({ localHour: 19, status: COMPLETED }),
        entry({ localHour: 20, status: COMPLETED }),
        entry({ localHour: 23, status: FAILED }),
      ]);

      const noche = byHourBand.find((b) => b.band === HourBand.NOCHE)!;
      const nocturno = byHourBand.find((b) => b.band === HourBand.NOCTURNO)!;

      expect(noche.total).toBe(2);
      expect(noche.rate).toBe(100);
      expect(nocturno.rate).toBe(0);
      expect(noche.label).toBe('6pm-10pm');
    });

    it('devuelve los siete días aunque falten datos', () => {
      const { byWeekday } = build([entry({ weekday: 1 })]);
      expect(byWeekday).toHaveLength(7);
      expect(byWeekday[0].rate).toBeNull();
      expect(byWeekday[1].rate).toBe(100);
    });

    it('ordena las categorías por volumen', () => {
      const { byCategory } = build([
        entry({ category: 'gym' }),
        entry({ category: 'trabajo' }),
        entry({ category: 'trabajo' }),
        entry({ category: null }),
      ]);

      expect(byCategory.map((c) => c.category)).toEqual(['trabajo', 'gym']);
    });
  });

  describe('tendencia', () => {
    it('agrupa por semana empezando en lunes', () => {
      const { trend } = build([
        // Miércoles y viernes de la misma semana.
        entry({ closedAt: at('2026-09-02T19:00:00') }),
        entry({ closedAt: at('2026-09-04T19:00:00'), status: FAILED }),
        // Lunes siguiente.
        entry({ closedAt: at('2026-09-07T19:00:00') }),
      ]);

      expect(trend).toHaveLength(2);
      expect(trend[0].weekStart).toBe('2026-08-31');
      expect(trend[0].total).toBe(2);
      expect(trend[0].rate).toBe(50);
      expect(trend[1].weekStart).toBe('2026-09-07');
    });
  });

  describe('calibración', () => {
    it('compara lo predicho con lo que pasó', () => {
      const { calibration } = build([
        entry({ commitmentScore: 70, status: COMPLETED }),
        entry({ commitmentScore: 72, status: COMPLETED }),
        entry({ commitmentScore: 74, status: FAILED }),
        entry({ commitmentScore: 15, status: FAILED }),
      ]);

      const alto = calibration.find((b) => b.bucket === '61-80')!;
      expect(alto.n).toBe(3);
      expect(alto.predictedAvg).toBe(72);
      expect(alto.actualRate).toBe(67);

      const bajo = calibration.find((b) => b.bucket === '0-20')!;
      expect(bajo.n).toBe(1);
      expect(bajo.actualRate).toBe(0);
    });

    it('lo que nunca se predijo no entra', () => {
      const { calibration } = build([entry({ commitmentScore: null })]);
      expect(calibration.every((b) => b.n === 0)).toBe(true);
    });
  });

  describe('recomendaciones', () => {
    it('separa las seguidas de las ignoradas y mide el resultado', () => {
      const suggested = at('2026-09-01T19:00:00');
      const { recommendations } = build([
        entry({
          suggestedAt: suggested,
          recommendationAccepted: true,
          status: COMPLETED,
        }),
        entry({
          suggestedAt: suggested,
          recommendationAccepted: true,
          status: FAILED,
        }),
        entry({
          suggestedAt: suggested,
          recommendationAccepted: false,
          status: FAILED,
        }),
        // Sin sugerencia: no cuenta en ningún lado.
        entry({ suggestedAt: null, status: COMPLETED }),
      ]);

      expect(recommendations.suggested).toBe(3);
      expect(recommendations.accepted).toBe(2);
      expect(recommendations.completedWhenAccepted).toBe(1);
      expect(recommendations.completedWhenIgnored).toBe(0);
    });
  });

  describe('frases del panel', () => {
    it('solo afirma lo que tiene muestra suficiente', () => {
      const { highlights } = build([entry({ localHour: 19 })]);
      expect(highlights).toHaveLength(0);
    });

    it('nombra la mejor franja con su porcentaje real', () => {
      const manana = Array.from({ length: 4 }, () =>
        entry({ localHour: 7, weekday: 2, status: COMPLETED }),
      );
      const noche = Array.from({ length: 4 }, () =>
        entry({ localHour: 23, weekday: 3, status: FAILED }),
      );

      const { highlights } = build([...manana, ...noche]);
      const best = highlights.find((h) => h.type === 'best_band');

      expect(best?.text).toContain('6am-12pm');
      expect(best?.text).toContain('100%');
    });
  });
});
