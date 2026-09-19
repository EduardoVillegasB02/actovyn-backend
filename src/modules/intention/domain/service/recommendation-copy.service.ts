import { CONFIDENCE_THRESHOLDS } from '../constant';
import { SlotSuggestion } from '../entity/behavior-profile.entity';
import { Recommendation } from '../entity/recommendation.entity';
import { CountableFactorKey, FactorKey, RiskLevel } from '../enum';
import { FactorEvidence, ScoreFactors } from '../vo';
import { RankedFactor } from './commitment-score.service';
import { HourBandService } from './hour-band.service';

/** Todo lo que hace falta para explicar un score, ya calculado. */
export interface ExplainContext {
  objective: string;
  commitmentScore: number;
  risk: RiskLevel;
  factors: ScoreFactors;
  /** Factores de peor a mejor. */
  weakest: RankedFactor[];
  evidence: FactorEvidence;
  /** Hora alternativa sacada del historial; null si no hay mejora que valga. */
  slot: SlotSuggestion | null;
  localHour: number | null;
  sampleSize: number;
}

export const RISK_LABEL: Readonly<Record<RiskLevel, string>> = {
  [RiskLevel.VERY_LIKELY]: 'Muy probable que lo cumplas',
  [RiskLevel.LIKELY]: 'Probable que lo cumplas',
  [RiskLevel.UNCERTAIN]: 'Incierto',
  [RiskLevel.HIGH_RISK]: 'Riesgo alto de que no lo cumplas',
  [RiskLevel.VERY_HIGH_RISK]: 'Riesgo muy alto de que no lo cumplas',
};

/**
 * Explicación por reglas: el respaldo cuando no hay LLM o cuando falla.
 * Recibe los números YA calculados y solo los pone en palabras. Nunca inventa
 * uno: todo lo que dice sale del contexto.
 */
export class RecommendationCopyService {
  /** Cuántas evidencias se citan como máximo en el motivo. */
  private static readonly MAX_REASONS = 2;

  /** 19 -> "7pm", 0 -> "12am", 12 -> "12pm". */
  static formatHour12(hour: number): string {
    const suffix = hour < 12 ? 'am' : 'pm';
    const h = hour % 12 === 0 ? 12 : hour % 12;
    return `${h}${suffix}`;
  }

  static ruleBased(ctx: ExplainContext): Recommendation {
    return Recommendation.create(
      RecommendationCopyService.reason(ctx),
      RecommendationCopyService.suggestion(ctx),
    );
  }

  private static reason(ctx: ExplainContext): string {
    const head = `${RISK_LABEL[ctx.risk]} (${ctx.commitmentScore}/100).`;

    if (ctx.sampleSize < CONFIDENCE_THRESHOLDS.medium)
      return `${head} Aún tengo poco historial tuyo (${ctx.sampleSize} intenciones cerradas): el score parte de un punto neutro y se afinará con cada resultado que registres.`;

    const good =
      ctx.risk === RiskLevel.LIKELY || ctx.risk === RiskLevel.VERY_LIKELY;

    // Con buen pronóstico se explica qué lo sostiene; con malo, qué lo hunde.
    const ordered = good ? [...ctx.weakest].reverse() : ctx.weakest;
    const parts = ordered
      .map((f) => RecommendationCopyService.describeFactor(f, ctx))
      .filter((s): s is string => s !== null)
      .slice(0, RecommendationCopyService.MAX_REASONS);

    return parts.length
      ? `${head} ${good ? 'A favor' : 'En contra'}: ${parts.join('; ')}.`
      : head;
  }

  private static suggestion(ctx: ExplainContext): string {
    if (ctx.slot && ctx.localHour !== null) {
      const currentBand = HourBandService.label(
        HourBandService.of(ctx.localHour),
      );
      return `Muévela a las ${RecommendationCopyService.formatHour12(ctx.slot.hour)} (franja ${ctx.slot.label}): ahí cumples el ${RecommendationCopyService.pct(ctx.slot.adherence)} frente al ${RecommendationCopyService.pct(ctx.factors.timeCompatibility)} de tu franja actual (${currentBand}).`;
    }

    if (
      ctx.risk === RiskLevel.HIGH_RISK ||
      ctx.risk === RiskLevel.VERY_HIGH_RISK
    )
      return `Divídela en dos bloques cortos y empieza hoy por el primer paso concreto de "${ctx.objective}": una tarea partida se abandona menos que una grande.`;

    if (ctx.risk === RiskLevel.UNCERTAIN)
      return `Define el primer paso concreto de "${ctx.objective}" y bloquea la hora en tu calendario: el compromiso está en el límite.`;

    if (ctx.localHour === null)
      return `Buen pronóstico. Ponle una hora concreta a "${ctx.objective}": sin hora no puedo cuidarte la franja.`;

    return `Buen momento para "${ctx.objective}": mantén la hora y protégela en tu calendario.`;
  }

  /** Frase de evidencia de un factor; null si no hay datos que citar. */
  private static describeFactor(
    ranked: RankedFactor,
    ctx: ExplainContext,
  ): string | null {
    const { factors, evidence, localHour } = ctx;
    const pct = (value: number) => RecommendationCopyService.pct(value);
    const countable = (key: CountableFactorKey) => evidence.has(key);

    switch (ranked.factor) {
      case FactorKey.HISTORICAL_ADHERENCE:
        return countable(FactorKey.HISTORICAL_ADHERENCE)
          ? `en tareas de esta categoría cumples el ${pct(factors.historicalAdherence)} (${evidence.of(FactorKey.HISTORICAL_ADHERENCE)} registros)`
          : null;

      case FactorKey.TIME_COMPATIBILITY:
        return localHour !== null && countable(FactorKey.TIME_COMPATIBILITY)
          ? `en la franja ${HourBandService.label(HourBandService.of(localHour))} cumples el ${pct(factors.timeCompatibility)} (${evidence.of(FactorKey.TIME_COMPATIBILITY)} registros)`
          : null;

      case FactorKey.DIFFICULTY_FIT:
        return countable(FactorKey.DIFFICULTY_FIT)
          ? `con tareas de esta dificultad cumples el ${pct(factors.difficultyFit)} (${evidence.of(FactorKey.DIFFICULTY_FIT)} registros)`
          : null;

      case FactorKey.RECENT_CONSISTENCY:
        return ctx.sampleSize > 0
          ? `tus últimas intenciones cerradas van al ${pct(factors.recentConsistency)}`
          : null;

      case FactorKey.LINGUISTIC_CONFIDENCE:
        return factors.linguisticConfidence < 50
          ? `tu mensaje suena tentativo (${pct(factors.linguisticConfidence)} de convicción)`
          : null;
    }
  }

  private static pct(value: number): string {
    return `${Math.round(value)}%`;
  }
}
