export const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

/** Si el modelo tarda más que esto, la demo no espera: cae al fixture. */
export const OPENAI_TIMEOUT_MS = 12_000;

export const OPENAI_DEFAULT_MODEL = 'gpt-4o-mini';

/** temperature 0: la misma frase debe extraer siempre lo mismo. */
export const OPENAI_TEMPERATURE = 0;

/** Convicción por defecto si el modelo no manda un número usable. */
export const FALLBACK_LINGUISTIC_CONFIDENCE = 70;

/** Un texto más corto que esto no es una explicación. */
export const MIN_COPY_LENGTH = 10;

/** Cuánto del cuerpo de error se registra cuando la API responde mal. */
export const ERROR_BODY_PREVIEW = 200;
