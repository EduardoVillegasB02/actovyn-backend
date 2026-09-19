import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LIMA_ZONE } from 'src/shared/util/zone.util';
import {
  ExplainContext,
  RecommendationCopyService,
} from '../../../../domain/service';
import {
  AiPort,
  IntentDraft,
  RecommendationCopy,
} from '../../../../application/port/out';
import { FixtureAiAdapter } from './fixture-ai.adapter';
import { OpenAiResponseParser } from './openai-response.parser';
import { IntentionPrompt } from './prompt/intention.prompt';
import {
  ERROR_BODY_PREVIEW,
  OPENAI_DEFAULT_MODEL,
  OPENAI_TEMPERATURE,
  OPENAI_TIMEOUT_MS,
  OPENAI_URL,
} from './constant/openai.constant';

interface ChatCompletion {
  choices?: { message?: { content?: string } }[];
}

interface OpenAiErrorBody {
  error?: { message?: string; param?: string; type?: string };
}

interface ChatAttempt {
  ok: boolean;
  status: number;
  body: string;
}

/**
 * Ajustes que mejoran la respuesta pero que no todos los modelos aceptan.
 * Si uno se rechaza, se omite y se vuelve a intentar.
 */
const DROPPABLE_PARAMS = ['temperature', 'response_format'] as const;

type OptionalParam = (typeof DROPPABLE_PARAMS)[number];

/**
 * Adaptador de OpenAI. Usa fetch nativo de Node: sin SDK, sin dependencia
 * extra que mantener.
 *
 * Contrato de resiliencia, pensado para que una demo no dependa del wifi:
 *  - analyze(): si la API falla o el JSON no valida, cae al fixture.
 *  - explain(): lanza, y el caso de uso ya tiene su respaldo por reglas.
 *
 * El LLM extrae señales y redacta. Nunca calcula el score.
 */
@Injectable()
export class OpenAiAdapter implements AiPort {
  private readonly logger = new Logger(OpenAiAdapter.name);
  private readonly zone = LIMA_ZONE;

  /** Ajustes que este modelo ya rechazó. Se aprende una vez por proceso. */
  private readonly unsupported = new Set<OptionalParam>();

  constructor(
    private readonly config: ConfigService,
    private readonly fixture: FixtureAiAdapter,
  ) {}

  async analyze(message: string, now: Date): Promise<IntentDraft> {
    try {
      const raw = await this.chat(
        IntentionPrompt.extract(
          this.zone.toLocalIso(now),
          this.zone.name,
          this.zone.offsetHours,
        ),
        message,
      );
      return OpenAiResponseParser.toDraft(
        OpenAiResponseParser.toObject(raw),
        message,
        this.zone,
      );
    } catch (error) {
      this.logger.warn(
        `OpenAI no pudo extraer, uso el fixture: ${String(error)}`,
      );
      return this.fixture.analyze(message, now);
    }
  }

  async explain(ctx: ExplainContext): Promise<RecommendationCopy> {
    const raw = await this.chat(
      IntentionPrompt.explain(),
      JSON.stringify(this.toExplainPayload(ctx)),
    );
    return OpenAiResponseParser.toCopy(OpenAiResponseParser.toObject(raw));
  }

  /** Solo lo que el modelo necesita para redactar. Ni un número más. */
  private toExplainPayload(ctx: ExplainContext): Record<string, unknown> {
    return {
      objective: ctx.objective,
      commitment_score: ctx.commitmentScore,
      risk: ctx.risk,
      sample_size: ctx.sampleSize,
      factors: ctx.factors.toRecord(),
      evidence: ctx.evidence.toRecord(),
      weakest_first: ctx.weakest.map((w) => w.factor),
      local_hour: ctx.localHour,
      slot: ctx.slot
        ? {
            hour: ctx.slot.hour,
            hour_label: RecommendationCopyService.formatHour12(ctx.slot.hour),
            label: ctx.slot.label,
            adherence: ctx.slot.adherence,
            gain: ctx.slot.gain,
          }
        : null,
    };
  }

  /**
   * Llama al modelo y, si rechaza un ajuste opcional, lo descarta y reintenta.
   *
   * Los modelos nuevos solo admiten la temperatura por defecto, y eso tumbaba
   * todas las peticiones: el sistema acababa siempre en el fixture sin que se
   * notara. En vez de fijar una lista de modelos que envejece cada mes, se
   * aprende del primer rechazo y se recuerda para el resto del proceso.
   *
   * Como cada vuelta descarta un ajuste distinto, el bucle siempre termina.
   */
  private async chat(system: string, user: string): Promise<string> {
    for (let attempt = 0; attempt <= DROPPABLE_PARAMS.length; attempt += 1) {
      const response = await this.post(system, user);
      if (response.ok) return OpenAiAdapter.contentOf(response.body);

      const rejected = this.droppableParam(response.body);
      // Sin un ajuste que soltar no hay nada que reintentar, y soltar uno que
      // ya estaba descartado sería girar en el sitio.
      if (!rejected || this.unsupported.has(rejected))
        throw OpenAiAdapter.httpError(response);

      this.unsupported.add(rejected);
      this.logger.warn(
        `El modelo no admite "${rejected}", lo omito de aquí en adelante`,
      );
    }

    throw new Error('OpenAI rechazó la petición tras descartar los ajustes');
  }

  private async post(system: string, user: string): Promise<ChatAttempt> {
    const apiKey = this.config.get<string>('AI_KEY');
    if (!apiKey) throw new Error('AI_KEY no está configurada');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    try {
      const response = await fetch(OPENAI_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(this.buildPayload(system, user)),
      });

      return {
        ok: response.ok,
        status: response.status,
        body: await response.text(),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private buildPayload(system: string, user: string): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      model: this.config.get<string>('AI_MODEL') ?? OPENAI_DEFAULT_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    };

    // temperature 0 da extracciones reproducibles y response_format evita
    // tener que rescatar el JSON de entre la prosa. Los dos son deseables,
    // ninguno imprescindible: el parser ya limpia y valida lo que llegue.
    if (!this.unsupported.has('temperature'))
      payload.temperature = OPENAI_TEMPERATURE;
    if (!this.unsupported.has('response_format'))
      payload.response_format = { type: 'json_object' };

    return payload;
  }

  /** Qué ajuste opcional rechazó el modelo, si es que fue eso. */
  private droppableParam(body: string): OptionalParam | null {
    let param: string | undefined;
    try {
      param = (JSON.parse(body) as OpenAiErrorBody).error?.param;
    } catch {
      // Cuerpo no JSON: se busca en el texto crudo.
    }

    const named = DROPPABLE_PARAMS.find((name) => name === param);
    if (named) return named;

    // Algunos modelos no rellenan `param` y solo lo dicen en el mensaje.
    return (
      DROPPABLE_PARAMS.find(
        (name) => !this.unsupported.has(name) && body.includes(name),
      ) ?? null
    );
  }

  private static httpError(attempt: ChatAttempt): Error {
    return new Error(
      `OpenAI HTTP ${attempt.status}: ${attempt.body.slice(0, ERROR_BODY_PREVIEW)}`,
    );
  }

  private static contentOf(body: string): string {
    const data = JSON.parse(body) as ChatCompletion;
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenAI respondió sin contenido');
    return content;
  }
}
