/**
 * Estos tests son parte del pitch, no burocracia: "el score es una regla
 * propia y testeada" se verifica aquí en unos pocos casos.
 *
 * Corren en milisegundos porque no tocan base de datos, ni red, ni Nest.
 */
import { LIMA_ZONE } from 'src/shared/util/zone.util';
import { BehaviorProfile, ClosedIntention, Prediction } from '../entity';
import { ConfidenceLevel, Difficulty, FactorKey, RiskLevel } from '../enum';
import { FactorEvidence, ScoreFactors, ScoreWeights } from '../vo';
import { CommitmentScoreService } from './commitment-score.service';

const closed = (
  category: string,
  difficulty: Difficulty,
  localHour: number,
  completed: boolean,
  daysAgo: number,
): ClosedIntention =>
  ClosedIntention.create(
    category,
    difficulty,
    localHour,
    completed,
    new Date(Date.now() - daysAgo * 86_400_000),
  );

const { LOW, MEDIUM, HIGH } = Difficulty;

const HISTORY: ClosedIntention[] = [
  closed('trabajo', HIGH, 23, false, 2),
  closed('trabajo', HIGH, 22, false, 6),
  closed('trabajo', HIGH, 23, false, 11),
  closed('trabajo', HIGH, 22, false, 16),
  closed('trabajo', HIGH, 23, true, 24),
  closed('estudio', HIGH, 23, false, 9),
  closed('estudio', HIGH, 22, false, 19),
  closed('trabajo', MEDIUM, 23, false, 13),
  closed('trabajo', MEDIUM, 19, true, 3),
  closed('trabajo', MEDIUM, 19, true, 8),
  closed('trabajo', MEDIUM, 20, true, 12),
  closed('trabajo', HIGH, 19, true, 15),
  closed('trabajo', HIGH, 18, true, 22),
  closed('trabajo', LOW, 20, true, 5),
  closed('estudio', MEDIUM, 19, true, 7),
  closed('estudio', MEDIUM, 20, true, 14),
  closed('estudio', HIGH, 19, false, 20),
  closed('gym', MEDIUM, 7, true, 1),
  closed('gym', MEDIUM, 7, true, 4),
  closed('gym', MEDIUM, 7, true, 10),
  closed('gym', MEDIUM, 7, true, 17),
  closed('gym', MEDIUM, 7, false, 23),
  closed('gym', LOW, 7, true, 26),
  closed('trabajo', MEDIUM, 15, true, 18),
  closed('trabajo', MEDIUM, 14, false, 21),
  closed('personal', LOW, 16, true, 25),
  closed('personal', LOW, 17, true, 27),
  closed('estudio', HIGH, 15, false, 28),
];

const factorsOf = (values: Record<FactorKey, number>) =>
  ScoreFactors.create(values);

/** Analiza una intención contra el historial completo. */
const analyze = (
  localHour: number | null,
  difficulty: Difficulty = HIGH,
  category = 'trabajo',
) => {
  const profile = BehaviorProfile.build(HISTORY);
  const { factors, evidence } = profile.deriveFactors({
    category,
    difficulty,
    localHour,
    linguisticConfidence: 85,
  });
  return {
    prediction: Prediction.build(factors, profile.sampleSize, evidence),
    slot: localHour === null ? null : profile.suggestBetterSlot(localHour),
  };
};

describe('smoothedRate (arranque en frío)', () => {
  it('sin datos devuelve el prior, no 0 ni 100', () => {
    expect(CommitmentScoreService.smoothedRate(0, 0)).toBe(50);
  });

  it('1 de 1 no vale lo mismo que 20 de 20', () => {
    expect(CommitmentScoreService.smoothedRate(1, 1)).toBeLessThan(
      CommitmentScoreService.smoothedRate(20, 20),
    );
  });

  it('converge a la tasa real con muestra grande', () => {
    expect(CommitmentScoreService.smoothedRate(80, 100)).toBeGreaterThan(75);
  });

  it('rechaza más éxitos que intentos', () => {
    expect(() => CommitmentScoreService.smoothedRate(3, 1)).toThrow();
  });
});

describe('cálculo del score', () => {
  it('es determinista: mismo input, mismo output', () => {
    const factors = factorsOf({
      [FactorKey.HISTORICAL_ADHERENCE]: 40,
      [FactorKey.TIME_COMPATIBILITY]: 30,
      [FactorKey.DIFFICULTY_FIT]: 50,
      [FactorKey.RECENT_CONSISTENCY]: 60,
      [FactorKey.LINGUISTIC_CONFIDENCE]: 80,
    });
    const weights = ScoreWeights.default();
    expect(CommitmentScoreService.compute(factors, weights)).toBe(
      CommitmentScoreService.compute(factors, weights),
    );
  });

  it('rechaza pesos que no suman 1', () => {
    expect(() =>
      ScoreWeights.create({
        [FactorKey.HISTORICAL_ADHERENCE]: 0.9,
        [FactorKey.TIME_COMPATIBILITY]: 0.25,
        [FactorKey.DIFFICULTY_FIT]: 0.2,
        [FactorKey.RECENT_CONSISTENCY]: 0.1,
        [FactorKey.LINGUISTIC_CONFIDENCE]: 0.1,
      }),
    ).toThrow();
  });

  it('las bandas de riesgo no se solapan', () => {
    expect(CommitmentScoreService.classifyRisk(80)).toBe(RiskLevel.VERY_LIKELY);
    expect(CommitmentScoreService.classifyRisk(79)).toBe(RiskLevel.LIKELY);
    expect(CommitmentScoreService.classifyRisk(39)).toBe(RiskLevel.HIGH_RISK);
    expect(CommitmentScoreService.classifyRisk(19)).toBe(
      RiskLevel.VERY_HIGH_RISK,
    );
  });
});

describe('guard rail', () => {
  const weakTimeSlot = factorsOf({
    [FactorKey.HISTORICAL_ADHERENCE]: 90,
    [FactorKey.TIME_COMPATIBILITY]: 20,
    [FactorKey.DIFFICULTY_FIT]: 90,
    [FactorKey.RECENT_CONSISTENCY]: 90,
    [FactorKey.LINGUISTIC_CONFIDENCE]: 95,
  });

  const guard = (timeCompatibilityEvidence: number) => {
    const weights = ScoreWeights.default();
    return CommitmentScoreService.applyGuardRails(
      CommitmentScoreService.compute(weakTimeSlot, weights),
      weakTimeSlot,
      FactorEvidence.create({
        [FactorKey.TIME_COMPATIBILITY]: timeCompatibilityEvidence,
      }),
      weights,
    );
  };

  it('un factor crítico bajo CON evidencia topea el score', () => {
    const result = guard(8);
    expect(result.score).toBeLessThanOrEqual(39);
    expect(result.cappedBy).toContain(FactorKey.TIME_COMPATIBILITY);
  });

  it('NO topea si el factor bajo viene de una sola observación', () => {
    expect(guard(1).cappedBy).toHaveLength(0);
  });
});

describe('el caso de la demo', () => {
  it('la MISMA tarea puntúa distinto según la hora', () => {
    const noche = analyze(23).prediction;
    const tarde = analyze(19).prediction;

    expect(noche.commitmentScore).toBeLessThan(tarde.commitmentScore);
    expect(noche.risk).toBe(RiskLevel.HIGH_RISK);
    expect(tarde.risk).toBe(RiskLevel.LIKELY);
    expect(noche.cappedBy).toContain(FactorKey.TIME_COMPATIBILITY);
  });

  it('3 fallos de gym NO condenan una tarea sin relación', () => {
    const soloGym = [
      closed('gym', MEDIUM, 7, false, 1),
      closed('gym', MEDIUM, 7, false, 3),
      closed('gym', MEDIUM, 7, false, 5),
    ];
    const profile = BehaviorProfile.build(soloGym);
    const { factors, evidence } = profile.deriveFactors({
      category: 'personal',
      difficulty: LOW,
      localHour: 16,
      linguisticConfidence: 70,
    });
    const prediction = Prediction.build(factors, profile.sampleSize, evidence);

    // Antes del piso del prior esto daba 30, es decir HIGH_RISK.
    expect(prediction.commitmentScore).toBeGreaterThanOrEqual(40);
    expect(prediction.confidence).toBe(ConfidenceLevel.LOW);
    expect(prediction.cappedBy).toHaveLength(0);
  });

  it('sugiere una hora que sale del historial, no del LLM', () => {
    const { slot } = analyze(23);
    expect(slot).not.toBeNull();
    expect(slot!.hour).toBeGreaterThanOrEqual(18);
    expect(slot!.hour).toBeLessThanOrEqual(21);
  });

  it('NO sugiere mover algo que ya funciona', () => {
    expect(analyze(7, MEDIUM, 'gym').slot).toBeNull();
  });

  it('usuario nuevo: score neutro y confianza LOW', () => {
    const profile = BehaviorProfile.build([]);
    const { factors, evidence } = profile.deriveFactors({
      category: 'trabajo',
      difficulty: HIGH,
      localHour: 23,
      linguisticConfidence: 85,
    });
    const prediction = Prediction.build(factors, profile.sampleSize, evidence);

    expect(prediction.confidence).toBe(ConfidenceLevel.LOW);
    // Sin datos no se acusa a nadie.
    expect(prediction.cappedBy).toHaveLength(0);
    expect(prediction.commitmentScore).toBeGreaterThan(40);
  });

  it('sin hora declarada no inventa señal de horario', () => {
    expect(analyze(null).prediction.cappedBy).not.toContain(
      FactorKey.TIME_COMPATIBILITY,
    );
  });
});

describe('zona horaria', () => {
  it('22:00 local sobrevive el viaje a UTC y de vuelta', () => {
    expect(LIMA_ZONE.hour(LIMA_ZONE.toUtc('2026-09-13T22:00:00'))).toBe(22);
  });

  it('una hora nocturna cruza de día en UTC', () => {
    expect(LIMA_ZONE.toUtc('2026-09-13T22:00:00').toISOString()).toBe(
      '2026-09-14T03:00:00.000Z',
    );
  });

  it('rechaza una fecha que no existe', () => {
    expect(() => LIMA_ZONE.toUtc('2026-02-30T10:00')).toThrow();
  });
});
