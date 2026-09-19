import { Difficulty } from '../../../domain/enum';
import { ExplainContext } from '../../../domain/service';

/**
 * El puerto que de verdad protege algo: el LLM es la pieza incierta del
 * sistema (proveedor, caídas, formato, coste). Detrás hay dos adaptadores
 * intercambiables por variable de entorno.
 */
export const AI_PORT = Symbol('AiPort');

/**
 * Lo que el extractor devuelve a partir del texto libre.
 * Son SEÑALES, no decisiones: el score lo calcula el dominio.
 */
export interface IntentDraft {
  /** El compromiso en limpio, sin la fecha ni la hora. */
  objective: string;
  /** trabajo | estudio | gym | personal | salud... null si no se reconoce. */
  category: string | null;
  difficulty: Difficulty;
  /** 'YYYY-MM-DDTHH:mm:ss' en hora LOCAL. null si el usuario no dio hora. */
  scheduledAtLocal: string | null;
  /** 0-100. "sí o sí" alto, "trataré" bajo. Única señal del LLM en el score. */
  linguisticConfidence: number;
}

/** Texto redactado para el usuario. Sin fechas ni entidades del dominio. */
export interface RecommendationCopy {
  reason: string;
  suggestion: string;
}

export interface AiPort {
  /** Texto libre -> estructura. `now` resuelve "hoy", "mañana", "el lunes". */
  analyze(message: string, now: Date): Promise<IntentDraft>;
  /** Redacta con los números YA calculados. Prohibido inventar otros. */
  explain(ctx: ExplainContext): Promise<RecommendationCopy>;
}
