/**
 * El extractor offline es el plan B de la demo, así que tiene que ser fiable
 * sin red. Estos casos fijan lo que entiende del español de a pie y, sobre
 * todo, lo que NO debe inventarse.
 */
import { LIMA_ZONE } from 'src/shared/util/zone.util';
import { Difficulty } from '../../../../domain/enum';
import { FixtureAiAdapter } from './fixture-ai.adapter';

describe('FixtureAiAdapter', () => {
  const adapter = new FixtureAiAdapter();

  /** Viernes 11 de septiembre de 2026, 09:00 en Lima. */
  const NOW = LIMA_ZONE.toUtc('2026-09-11T09:00:00');

  const analyze = (message: string, now: Date = NOW) =>
    adapter.analyze(message, now);

  describe('hora', () => {
    it('entiende "mañana ... a las 11pm" como el día siguiente a las 23h', async () => {
      const draft = await analyze('Mañana termino mi informe a las 11pm');
      expect(draft.scheduledAtLocal).toBe('2026-09-12T23:00:00');
    });

    it('entiende "hoy a las 14:30"', async () => {
      const draft = await analyze('Hoy reviso el reporte a las 14:30');
      expect(draft.scheduledAtLocal).toBe('2026-09-11T14:30:00');
    });

    it('una hora que ya pasó se entiende como mañana', async () => {
      // Son las 9am: "a las 7" de hoy ya pasó.
      const draft = await analyze('Voy al gym a las 7');
      expect(draft.scheduledAtLocal).toBe('2026-09-12T07:00:00');
    });

    it('"el lunes" salta al lunes siguiente', async () => {
      const draft = await analyze('El lunes estudio para el parcial a las 8pm');
      expect(draft.scheduledAtLocal).toBe('2026-09-14T20:00:00');
    });

    it('NO confunde un número suelto con una hora', async () => {
      const draft = await analyze('Leer 20 páginas del libro');
      expect(draft.scheduledAtLocal).toBeNull();
    });

    it('sin hora no inventa una', async () => {
      const draft = await analyze('Ordenar el cuarto');
      expect(draft.scheduledAtLocal).toBeNull();
    });
  });

  describe('categoría y dificultad', () => {
    it('reconoce el gym', async () => {
      const draft = await analyze('Mañana voy al gimnasio a las 7am');
      expect(draft.category).toBe('gym');
    });

    it('reconoce trabajo y lo marca difícil', async () => {
      const draft = await analyze('Mañana termino el informe a las 10pm');
      expect(draft.category).toBe('trabajo');
      expect(draft.difficulty).toBe(Difficulty.HIGH);
    });

    it('una tarea corta es de dificultad baja', async () => {
      const draft = await analyze('Llamar a mamá hoy a las 8pm');
      expect(draft.difficulty).toBe(Difficulty.LOW);
    });

    it('sin palabras conocidas no fuerza categoría', async () => {
      const draft = await analyze('Regar las plantas del balcón');
      expect(draft.category).toBeNull();
    });
  });

  describe('convicción lingüística', () => {
    it('el lenguaje firme sube la convicción', async () => {
      const firme = await analyze('Sí o sí termino el informe hoy a las 8pm');
      const tibio = await analyze(
        'Trataré de terminar el informe hoy a las 8pm',
      );
      expect(firme.linguisticConfidence).toBeGreaterThan(
        tibio.linguisticConfidence,
      );
    });

    it('cada duda resta y nunca baja de 0', async () => {
      const draft = await analyze(
        'Ojalá quizás tal vez pueda intentar ir a ver si capaz',
      );
      expect(draft.linguisticConfidence).toBeGreaterThanOrEqual(0);
      expect(draft.linguisticConfidence).toBeLessThan(50);
    });
  });

  describe('objetivo', () => {
    it('deja el compromiso sin la fecha ni la hora', async () => {
      const draft = await analyze('Mañana termino mi informe a las 11pm');
      expect(draft.objective).toBe('Termino mi informe');
    });

    it('nunca lo deja vacío', async () => {
      const draft = await analyze('Mañana a las 11pm');
      expect(draft.objective.length).toBeGreaterThan(0);
    });
  });
});
