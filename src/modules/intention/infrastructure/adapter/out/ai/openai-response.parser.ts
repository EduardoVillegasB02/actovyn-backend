import { clamp } from 'src/shared/util/number.util';
import { LOCAL_ISO } from 'src/shared/constants/time.contant';
import { FixedZone } from 'src/shared/util/fixed-zone.util';
import { DIFFICULTIES, Difficulty } from '../../../../domain/enum';
import {
  IntentDraft,
  RecommendationCopy,
} from '../../../../application/port/out';
import {
  FALLBACK_LINGUISTIC_CONFIDENCE,
  MIN_COPY_LENGTH,
} from './constant/openai.constant';

/** Longitud de 'YYYY-MM-DDTHH:mm', es decir sin los segundos. */
const ISO_MINUTES_LENGTH = 16;

/**
 * Nada de lo que devuelve el modelo se cree sin revisar. Este parser es la
 * aduana: limpia el JSON, verifica cada campo y aplica valores por defecto,
 * de modo que el dominio siempre reciba un IntentDraft válido.
 */
export class OpenAiResponseParser {
  /** Quita fences y texto sobrante antes de parsear. */
  static toObject(raw: string): Record<string, unknown> {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    const body =
      start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;

    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new TypeError('El LLM no devolvió un objeto JSON');
    return parsed as Record<string, unknown>;
  }

  static toDraft(
    raw: Record<string, unknown>,
    message: string,
    zone: FixedZone,
  ): IntentDraft {
    return {
      objective: OpenAiResponseParser.objective(raw.objective, message),
      category: OpenAiResponseParser.category(raw.category),
      difficulty: OpenAiResponseParser.difficulty(raw.difficulty),
      scheduledAtLocal: OpenAiResponseParser.scheduledAt(
        raw.scheduled_at_local,
        zone,
      ),
      linguisticConfidence: OpenAiResponseParser.confidence(
        raw.linguistic_confidence,
      ),
    };
  }

  static toCopy(raw: Record<string, unknown>): RecommendationCopy {
    const reason = typeof raw.reason === 'string' ? raw.reason.trim() : '';
    const suggestion =
      typeof raw.suggestion === 'string' ? raw.suggestion.trim() : '';

    if (reason.length < MIN_COPY_LENGTH || suggestion.length < MIN_COPY_LENGTH)
      throw new TypeError('El LLM devolvió reason/suggestion inservibles');

    return { reason, suggestion };
  }

  /** Si el modelo no da un objetivo usable, el mensaje original sirve. */
  private static objective(value: unknown, message: string): string {
    return typeof value === 'string' && value.trim().length >= 3
      ? value.trim()
      : message.trim();
  }

  /**
   * Se acepta una categoría fuera del catálogo a propósito: el motor solo la
   * usa para agrupar tareas parecidas entre sí, y forzarla al catálogo metería
   * "meditar" en la misma bolsa que "gym".
   */
  private static category(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    return value.trim().toLowerCase() || null;
  }

  private static difficulty(value: unknown): Difficulty {
    const raw = typeof value === 'string' ? value.toUpperCase() : '';
    return DIFFICULTIES.includes(raw as Difficulty)
      ? (raw as Difficulty)
      : Difficulty.MEDIUM;
  }

  private static scheduledAt(value: unknown, zone: FixedZone): string | null {
    if (typeof value !== 'string' || !value.trim()) return null;
    const text = value.trim();

    if (LOCAL_ISO.test(text))
      return text.length === ISO_MINUTES_LENGTH ? `${text}:00` : text;

    // Vino con zona (Z o +00:00): se traduce a la hora local del usuario.
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : zone.toLocalIso(parsed);
  }

  private static confidence(value: unknown): number {
    const confidence = Number(value);
    return Number.isFinite(confidence)
      ? Math.round(clamp(confidence))
      : FALLBACK_LINGUISTIC_CONFIDENCE;
  }
}
