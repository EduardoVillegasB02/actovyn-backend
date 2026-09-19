import { clamp } from 'src/shared/util/number.util';
import {
  MIN_BAND_SAMPLE,
  MIN_PRIOR_SAMPLE,
  NEUTRAL_PRIOR,
  RECENT_WINDOW,
  SLOT_IMPROVEMENT_MARGIN,
} from '../constant';
import { DIFFICULTIES, Difficulty, FactorKey, HourBand } from '../enum';
import { CommitmentScoreService } from '../service/commitment-score.service';
import { HourBandService } from '../service/hour-band.service';
import { FactorEvidence, ScoreFactors } from '../vo';
import { ClosedIntention } from './closed-intention.entity';

export interface BandStats {
  band: HourBand;
  label: string;
  n: number;
  adherence: number;
}

export interface DifficultyStats {
  difficulty: Difficulty;
  n: number;
  adherence: number;
}

/** Lo que se sabe de una intención nueva antes de puntuarla. */
export interface IntentionSignal {
  category: string | null;
  difficulty: Difficulty;
  /** null cuando el usuario no declaró hora. No se inventa una. */
  localHour: number | null;
  /** 0-100. Lo único que aporta el LLM al score. */
  linguisticConfidence: number;
}

export interface SlotSuggestion {
  hour: number;
  band: HourBand;
  label: string;
  adherence: number;
  /** Puntos de adherencia que se ganan frente a la franja actual. */
  gain: number;
}

export interface DerivedFactors {
  factors: ScoreFactors;
  evidence: FactorEvidence;
}

/**
 * El retrato de comportamiento de un usuario, calculado a partir de su
 * historial ya leído. Ni una línea de Prisma aquí: por eso el motor se puede
 * testear entero sin base de datos.
 */
export class BehaviorProfile {
  private constructor(
    private readonly _history: readonly ClosedIntention[],
    private readonly _overallAdherence: number,
    private readonly _priorBase: number,
    private readonly _byBand: readonly BandStats[],
    private readonly _byDifficulty: readonly DifficultyStats[],
    private readonly _recentConsistency: number,
    private readonly _bestBand: BandStats | null,
    private readonly _worstBand: BandStats | null,
  ) {}

  static build(history: readonly ClosedIntention[]): BehaviorProfile {
    const overall = BehaviorProfile.rate(history);

    // 3 fallos de gym no pueden condenar "leer un libro". El prior de los
    // sub-cortes hereda la adherencia global SOLO cuando hay muestra que la
    // justifique; con poca muestra vuelve al neutro.
    const priorBase =
      history.length >= MIN_PRIOR_SAMPLE ? overall : NEUTRAL_PRIOR;

    const byBand = HourBandService.all().map(({ band, label }) => {
      const rows = history.filter(
        (h) => HourBandService.of(h.localHour) === band,
      );
      return {
        band,
        label,
        n: rows.length,
        adherence: BehaviorProfile.rate(rows, priorBase),
      };
    });

    const byDifficulty = DIFFICULTIES.map((difficulty) => {
      const rows = history.filter((h) => h.difficulty === difficulty);
      return {
        difficulty,
        n: rows.length,
        adherence: BehaviorProfile.rate(rows, priorBase),
      };
    });

    const recent = [...history]
      .sort((a, b) => b.closedAt.getTime() - a.closedAt.getTime())
      .slice(0, RECENT_WINDOW);

    // Una franja con una sola observación no es "tu mejor horario".
    const ranked = byBand
      .filter((b) => b.n >= MIN_BAND_SAMPLE)
      .sort((a, b) => b.adherence - a.adherence);

    return new BehaviorProfile(
      history,
      overall,
      priorBase,
      byBand,
      byDifficulty,
      BehaviorProfile.rate(recent),
      ranked[0] ?? null,
      ranked[ranked.length - 1] ?? null,
    );
  }

  /**
   * Deriva los 5 factores de esta intención. Cuatro salen del historial real;
   * el quinto, linguistic_confidence, es la única señal del LLM.
   */
  deriveFactors(signal: IntentionSignal): DerivedFactors {
    // "Similar" filtra SOLO por categoría. Si además filtrara por dificultad,
    // los mismos fallos pesarían en historical_adherence (.35) y en
    // difficulty_fit (.20): 55% del score contado dos veces sobre las mismas
    // filas.
    const similar = signal.category
      ? this._history.filter((h) => h.category === signal.category)
      : this._history;

    // Sin hora declarada no hay señal de horario: cae al comportamiento global
    // y su evidencia queda en 0, así el guard rail no acusa por un dato que en
    // realidad no tenemos.
    const bandStats =
      signal.localHour === null ? null : this.bandOf(signal.localHour);
    const difficultyStats = this.difficultyOf(signal.difficulty);

    const factors = ScoreFactors.create({
      [FactorKey.HISTORICAL_ADHERENCE]: BehaviorProfile.rate(
        similar,
        this._priorBase,
      ),
      [FactorKey.TIME_COMPATIBILITY]: bandStats
        ? bandStats.adherence
        : this._priorBase,
      [FactorKey.DIFFICULTY_FIT]: difficultyStats.adherence,
      [FactorKey.RECENT_CONSISTENCY]: this._recentConsistency,
      [FactorKey.LINGUISTIC_CONFIDENCE]: clamp(signal.linguisticConfidence),
    });

    const evidence = FactorEvidence.create({
      [FactorKey.HISTORICAL_ADHERENCE]: similar.length,
      [FactorKey.TIME_COMPATIBILITY]: bandStats ? bandStats.n : 0,
      [FactorKey.DIFFICULTY_FIT]: difficultyStats.n,
    });

    return { factors, evidence };
  }

  /**
   * La hora alternativa sale de los DATOS, no del LLM.
   * Devuelve null cuando no hay una mejora que justifique mover nada.
   */
  suggestBetterSlot(currentHour: number): SlotSuggestion | null {
    if (!this._bestBand) return null;

    const current = HourBandService.of(currentHour);
    if (this._bestBand.band === current) return null;

    // Se compara contra la franja ACTUAL, no contra el promedio. Si donde ya
    // la puso le funciona bien, no hay nada que recomendar: mover el gym de
    // 7am, que cumple, a las 7pm sería un mal consejo aunque la tarde sea su
    // mejor franja global.
    const gain = this._bestBand.adherence - this.bandOf(currentHour).adherence;
    if (gain < SLOT_IMPROVEMENT_MARGIN) return null;

    return {
      hour: HourBandService.midHour(this._bestBand.band),
      band: this._bestBand.band,
      label: this._bestBand.label,
      adherence: this._bestBand.adherence,
      gain,
    };
  }

  bandOf(hour: number): BandStats {
    const band = HourBandService.of(hour);
    return this._byBand.find((b) => b.band === band)!;
  }

  difficultyOf(difficulty: Difficulty): DifficultyStats {
    return this._byDifficulty.find((d) => d.difficulty === difficulty)!;
  }

  get sampleSize(): number {
    return this._history.length;
  }

  get overallAdherence(): number {
    return this._overallAdherence;
  }

  /** Prior efectivo de los sub-cortes: la adherencia global o el neutro. */
  get priorBase(): number {
    return this._priorBase;
  }

  get byBand(): readonly BandStats[] {
    return this._byBand;
  }

  get byDifficulty(): readonly DifficultyStats[] {
    return this._byDifficulty;
  }

  get recentConsistency(): number {
    return this._recentConsistency;
  }

  get bestBand(): BandStats | null {
    return this._bestBand;
  }

  get worstBand(): BandStats | null {
    return this._worstBand;
  }

  /** Tasa de cumplimiento suavizada de un subconjunto del historial. */
  private static rate(
    rows: readonly ClosedIntention[],
    prior: number = NEUTRAL_PRIOR,
  ): number {
    return CommitmentScoreService.smoothedRate(
      rows.filter((r) => r.completed).length,
      rows.length,
      prior,
    );
  }
}
