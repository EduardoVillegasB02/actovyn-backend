/**
 * Cuando esta resiliencia se rompe, se rompe en silencio: el adaptador cae al
 * fixture y todo "funciona", solo que sin modelo. Por eso se fija aquí.
 */
import { ConfigService } from '@nestjs/config';
import { FixtureAiAdapter } from './fixture-ai.adapter';
import { OpenAiAdapter } from './openai-ai.adapter';

interface SentPayload {
  model: string;
  temperature?: number;
  response_format?: { type: string };
  messages: { role: string; content: string }[];
}

const ENV: Record<string, string> = {
  AI_KEY: 'clave-de-prueba',
  AI_MODEL: 'gpt-5.6-luna',
};

const config = {
  get: (key: string) => ENV[key],
} as unknown as ConfigService;

const ok = (content: string) =>
  ({
    ok: true,
    status: 200,
    text: () =>
      Promise.resolve(JSON.stringify({ choices: [{ message: { content } }] })),
  }) as unknown as Response;

const badRequest = (message: string, param?: string) =>
  ({
    ok: false,
    status: 400,
    text: () =>
      Promise.resolve(
        JSON.stringify({
          error: { message, param, type: 'invalid_request_error' },
        }),
      ),
  }) as unknown as Response;

const REJECTS_TEMPERATURE = badRequest(
  "Unsupported value: 'temperature' does not support 0 with this model. Only the default (1) value is supported.",
  'temperature',
);

const DRAFT = JSON.stringify({
  objective: 'Terminar el informe',
  category: 'trabajo',
  difficulty: 'HIGH',
  scheduled_at_local: '2026-09-12T23:00:00',
  linguistic_confidence: 90,
});

describe('OpenAiAdapter', () => {
  let fetchMock: jest.Mock<Promise<Response>, [string, RequestInit]>;
  let adapter: OpenAiAdapter;

  const sentPayloads = (): SentPayload[] =>
    fetchMock.mock.calls.map(
      ([, init]) => JSON.parse(init.body as string) as SentPayload,
    );

  beforeEach(() => {
    fetchMock = jest.fn<Promise<Response>, [string, RequestInit]>();
    global.fetch = fetchMock;
    adapter = new OpenAiAdapter(config, new FixtureAiAdapter());
  });

  const NOW = new Date('2026-09-11T14:00:00.000Z');

  it('pide temperatura 0 y JSON mientras el modelo los acepte', async () => {
    fetchMock.mockResolvedValueOnce(ok(DRAFT));

    await adapter.analyze('Mañana termino el informe a las 11pm', NOW);

    const [payload] = sentPayloads();
    expect(payload.model).toBe('gpt-5.6-luna');
    expect(payload.temperature).toBe(0);
    expect(payload.response_format).toEqual({ type: 'json_object' });
  });

  it('si el modelo rechaza la temperatura, reintenta sin ella', async () => {
    fetchMock
      .mockResolvedValueOnce(REJECTS_TEMPERATURE)
      .mockResolvedValueOnce(ok(DRAFT));

    const draft = await adapter.analyze(
      'Mañana termino el informe a las 11pm',
      NOW,
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [primero, segundo] = sentPayloads();
    expect(primero.temperature).toBe(0);
    expect(segundo).not.toHaveProperty('temperature');
    // El reintento sirvió: el objetivo viene del modelo, no del fixture.
    expect(draft.objective).toBe('Terminar el informe');
  });

  it('lo recuerda: la siguiente llamada ya no manda temperatura', async () => {
    fetchMock
      .mockResolvedValueOnce(REJECTS_TEMPERATURE)
      .mockResolvedValueOnce(ok(DRAFT))
      .mockResolvedValueOnce(ok(DRAFT));

    await adapter.analyze('Mañana termino el informe a las 11pm', NOW);
    await adapter.analyze('Mañana reviso el reporte a las 9pm', NOW);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sentPayloads()[2]).not.toHaveProperty('temperature');
  });

  it('también suelta response_format si es lo que molesta', async () => {
    fetchMock
      .mockResolvedValueOnce(
        badRequest('Unsupported parameter: response_format', 'response_format'),
      )
      .mockResolvedValueOnce(ok(DRAFT));

    await adapter.analyze('Mañana termino el informe a las 11pm', NOW);

    const [, segundo] = sentPayloads();
    expect(segundo).not.toHaveProperty('response_format');
    expect(segundo.temperature).toBe(0);
  });

  it('ante un error que no es de ajustes, cae al extractor offline', async () => {
    fetchMock.mockResolvedValue(
      badRequest('Incorrect API key provided', 'api_key'),
    );

    const draft = await adapter.analyze(
      'Mañana voy al gimnasio a las 7am',
      NOW,
    );

    // No reintenta: no hay nada que soltar.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(draft.category).toBe('gym');
  });

  it('explain propaga el fallo para que respondan las reglas del dominio', async () => {
    fetchMock.mockResolvedValue(
      badRequest('Rate limit reached', null as never),
    );

    await expect(
      adapter.explain({
        objective: 'Terminar el informe',
        commitmentScore: 35,
        risk: 'HIGH_RISK',
        factors: { toRecord: () => ({}) },
        weakest: [],
        evidence: { toRecord: () => ({}) },
        slot: null,
        localHour: 23,
        sampleSize: 12,
      } as never),
    ).rejects.toThrow(/OpenAI HTTP 400/);
  });
});
