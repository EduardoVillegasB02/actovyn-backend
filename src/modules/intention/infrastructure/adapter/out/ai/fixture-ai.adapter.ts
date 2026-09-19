import { Injectable } from '@nestjs/common';
import { clamp } from 'src/shared/util/number.util';
import { LIMA_ZONE } from 'src/shared/util/zone.util';
import { Difficulty } from '../../../../domain/enum';
import {
  ExplainContext,
  RecommendationCopyService,
} from '../../../../domain/service';
import {
  AiPort,
  IntentDraft,
  RecommendationCopy,
} from '../../../../application/port/out';
import {
  CATEGORY_KEYWORDS,
  CONFIDENCE_SCORING,
  DIFFICULTY_WORDS,
  HEDGE_WORDS,
  STRONG_WORDS,
  WEEKDAYS,
  WEEKDAYS_ASCII,
} from './constant/fixture-lexicon.constant';

interface ClockTime {
  hour: number;
  minute: number;
}

// Escapes \u explícitos: el patrón no depende de cómo el editor guardó los
// acentos (ñ precompuesta U+00F1 frente a n + combinante). La entrada se
// normaliza a NFC en analyze(), así el JSON del cliente y estos literales
// coinciden siempre.
const NN = 'ñ'; // ñ
const II = 'í'; // í

/** "a las 11pm", "a las 7 de la tarde", "a las 23:30", "11:00 pm". */
const HOUR_RE = new RegExp(
  `\\b(?:a\\s+las?|a\\s+eso\\s+de\\s+las?|tipo|sobre\\s+las?)?\\s*(\\d{1,2})(?::(\\d{2}))?\\s*(a\\.?\\s?m\\.?|p\\.?\\s?m\\.?|de\\s+la\\s+ma${NN}ana|de\\s+la\\s+tarde|de\\s+la\\s+noche|del\\s+mediod[${II}i]a|h\\b|hrs\\b|horas\\b)?`,
  'i',
);

/** Lo que convierte un número suelto en una hora de verdad. */
const HOUR_MARKER_RE =
  /a\s+las?|tipo|sobre|:|a\.?\s?m|p\.?\s?m|de\s+la|mediod|h\b|hrs|horas/i;

const DAY_RE = new RegExp(
  `\\b(pasado\\s+ma${NN}ana|ma${NN}ana|hoy|esta\\s+noche|esta\\s+tarde|al\\s+mediod[${II}i]a|a\\s+medianoche)\\b`,
  'gi',
);

const WEEKDAY_RE = new RegExp(
  `\\b(el|este|el\\s+pr\\u00f3ximo|el\\s+siguiente)\\s+(${WEEKDAYS.join('|')})\\b`,
  'gi',
);

/** Quita tildes y baja a minúsculas, para comparar contra el léxico ASCII. */
function strip(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Extractor OFFLINE por expresiones regulares. El plan B de la demo: sin red,
 * sin API key, determinista y gratis. Cubre el español peruano de a pie:
 * "Mañana termino mi informe a las 11pm", "el lunes voy al gym a las 7".
 */
@Injectable()
export class FixtureAiAdapter implements AiPort {
  private readonly zone = LIMA_ZONE;

  analyze(message: string, now: Date): Promise<IntentDraft> {
    // NFC unifica ñ y tildes venga como venga el JSON, para que los recortes
    // del objetivo casen con lo que el usuario escribió.
    const text = message.normalize('NFC').trim();
    const lower = strip(text);
    const time = this.extractHour(text);

    return Promise.resolve({
      objective: this.extractObjective(text),
      category: this.extractCategory(lower),
      difficulty: this.extractDifficulty(lower),
      scheduledAtLocal: this.buildLocalIso(
        now,
        this.extractDayOffset(lower, now, time),
        time,
      ),
      linguisticConfidence: this.extractConfidence(lower, time !== null),
    });
  }

  /** Sin red: la explicación sale de las reglas del dominio. */
  explain(ctx: ExplainContext): Promise<RecommendationCopy> {
    const copy = RecommendationCopyService.ruleBased(ctx);
    return Promise.resolve({
      reason: copy.reason,
      suggestion: copy.suggestion,
    });
  }

  private extractHour(text: string): ClockTime | null {
    const lower = strip(text);
    const match = HOUR_RE.exec(text);

    if (!match) {
      if (/mediodia/.test(lower)) return { hour: 12, minute: 0 };
      if (/medianoche/.test(lower)) return { hour: 0, minute: 0 };
      return null;
    }

    // Un número suelto sin marcador no es una hora: "leer 20 páginas" no es a
    // las 8pm.
    if (!HOUR_MARKER_RE.test(match[0])) return null;

    let hour = Number(match[1]);
    const minute = match[2] ? Number(match[2]) : 0;
    if (hour > 23 || minute > 59) return null;

    const marker = strip(match[3] ?? '');
    if (/p\.?\s?m|tarde|noche/.test(marker) && hour < 12) hour += 12;
    if (/a\.?\s?m|manana/.test(marker) && hour === 12) hour = 0;
    if (/mediod/.test(marker)) hour = 12;

    return { hour, minute };
  }

  /** Días a sumar respecto a hoy. null si el texto no menciona fecha. */
  private extractDayOffset(
    lower: string,
    now: Date,
    time: ClockTime | null,
  ): number | null {
    if (/\bpasado\s+manana\b/.test(lower)) return 2;
    // "mañana" como día, no "de la mañana" ni "por la mañana".
    if (/(^|[^a-z])(?<!(?:de|por|en|esta)\s+la\s+)manana\b/.test(lower))
      return 1;
    if (/\bhoy\b|\besta\s+noche\b|\besta\s+tarde\b/.test(lower)) return 0;

    const weekday =
      /\b(?:el|este|el\s+proximo|el\s+siguiente)\s+(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\b/.exec(
        lower,
      );
    if (weekday) {
      const target = WEEKDAYS_ASCII.indexOf(weekday[1]);
      const diff = (target - this.zone.weekday(now) + 7) % 7;
      // "el lunes" dicho un lunes es el lunes que viene, no hoy.
      return diff === 0 ? 7 : diff;
    }

    // Hora sin día: hoy si aún no pasó, mañana si ya pasó.
    if (time) return time.hour > this.zone.hour(now) ? 0 : 1;
    return null;
  }

  private buildLocalIso(
    now: Date,
    dayOffset: number | null,
    time: ClockTime | null,
  ): string | null {
    if (time === null) return null;
    const day = this.zone.dateIso(this.zone.addDays(now, dayOffset ?? 0));
    const hh = String(time.hour).padStart(2, '0');
    const mm = String(time.minute).padStart(2, '0');
    return `${day}T${hh}:${mm}:00`;
  }

  private extractCategory(lower: string): string | null {
    for (const { category, words } of CATEGORY_KEYWORDS)
      if (words.some((word) => lower.includes(strip(word)))) return category;
    return null;
  }

  private extractDifficulty(lower: string): Difficulty {
    const matches = (words: readonly string[]) =>
      words.some((word) => lower.includes(strip(word)));
    if (matches(DIFFICULTY_WORDS[Difficulty.HIGH])) return Difficulty.HIGH;
    if (matches(DIFFICULTY_WORDS[Difficulty.LOW])) return Difficulty.LOW;
    return Difficulty.MEDIUM;
  }

  /** Base 75. Hora explícita +10. Lenguaje firme +10. Cada duda -20. */
  private extractConfidence(lower: string, hasHour: boolean): number {
    let score = CONFIDENCE_SCORING.base;
    if (hasHour) score += CONFIDENCE_SCORING.withExplicitHour;
    if (STRONG_WORDS.some((word) => lower.includes(strip(word))))
      score += CONFIDENCE_SCORING.withStrongLanguage;

    const hedges = HEDGE_WORDS.filter((word) =>
      lower.includes(strip(word)),
    ).length;
    return clamp(score + hedges * CONFIDENCE_SCORING.perHedge);
  }

  /** Quita fecha y hora, y deja el compromiso en limpio. */
  private extractObjective(text: string): string {
    const clean = text
      .normalize('NFC')
      .replace(HOUR_RE, (match) => (HOUR_MARKER_RE.test(match) ? ' ' : match))
      .replace(DAY_RE, ' ')
      .replace(WEEKDAY_RE, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^[\s,.;:-]+|[\s,.;:!-]+$/g, '')
      .trim();

    const objective = clean || text.trim();
    return objective.charAt(0).toUpperCase() + objective.slice(1);
  }
}
