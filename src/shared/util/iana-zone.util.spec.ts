/**
 * El horario de verano es justo lo que FixedZone no sabe hacer. Estos casos
 * usan Madrid y Nueva York, donde el offset cambia dos veces al año.
 */
import { IanaZone } from './iana-zone.util';
import { LIMA_ZONE, resolveZone } from './zone.util';

describe('IanaZone', () => {
  const madrid = new IanaZone('Europe/Madrid');
  const newYork = new IanaZone('America/New_York');

  it('rechaza una zona que no existe', () => {
    expect(() => new IanaZone('Marte/Olympus')).toThrow();
    expect(IanaZone.isValid('Europe/Madrid')).toBe(true);
    expect(IanaZone.isValid('no-existe')).toBe(false);
  });

  describe('ida y vuelta', () => {
    it('conserva la hora local en invierno', () => {
      const utc = madrid.toUtc('2026-01-15T22:00:00');
      expect(utc.toISOString()).toBe('2026-01-15T21:00:00.000Z');
      expect(madrid.toLocalIso(utc)).toBe('2026-01-15T22:00:00');
      expect(madrid.hour(utc)).toBe(22);
    });

    it('conserva la hora local en verano, con el offset ya movido', () => {
      const utc = madrid.toUtc('2026-07-15T22:00:00');
      expect(utc.toISOString()).toBe('2026-07-15T20:00:00.000Z');
      expect(madrid.hour(utc)).toBe(22);
    });

    it('una hora nocturna cruza de día en UTC', () => {
      const utc = newYork.toUtc('2026-09-13T22:00:00');
      expect(utc.toISOString()).toBe('2026-09-14T02:00:00.000Z');
    });

    it('rechaza una fecha que no existe', () => {
      expect(() => madrid.toUtc('2026-02-30T10:00')).toThrow();
    });

    it('rechaza la hora que se salta el cambio de horario', () => {
      // En Madrid, el 29 de marzo de 2026 las 02:30 no existen.
      expect(() => madrid.toUtc('2026-03-29T02:30:00')).toThrow();
    });
  });

  describe('día de la semana y fecha', () => {
    it('usa el día local, no el de UTC', () => {
      // 21:00 en Nueva York del domingo ya es lunes en UTC.
      const utc = newYork.toUtc('2026-09-13T21:00:00');
      expect(utc.toISOString()).toBe('2026-09-14T01:00:00.000Z');
      expect(newYork.weekday(utc)).toBe(0);
      expect(newYork.dateIso(utc)).toBe('2026-09-13');
    });
  });

  describe('addDays', () => {
    it('conserva la hora de pared al cruzar al horario de verano', () => {
      // Nueva York adelanta el reloj el 8 de marzo de 2026.
      const sabado = newYork.toUtc('2026-03-07T12:00:00');
      const domingo = newYork.addDays(sabado, 1);

      expect(newYork.toLocalIso(domingo)).toBe('2026-03-08T12:00:00');
      // Son 23 horas reales, no 24: eso es lo que FixedZone no puede hacer.
      expect(domingo.getTime() - sabado.getTime()).toBe(23 * 3_600_000);
    });

    it('conserva la hora de pared al volver del horario de verano', () => {
      const sabado = newYork.toUtc('2026-10-31T12:00:00');
      const domingo = newYork.addDays(sabado, 1);

      expect(newYork.toLocalIso(domingo)).toBe('2026-11-01T12:00:00');
      expect(domingo.getTime() - sabado.getTime()).toBe(25 * 3_600_000);
    });

    it('resta días igual de bien', () => {
      const dia = madrid.toUtc('2026-07-15T08:00:00');
      expect(madrid.dateIso(madrid.addDays(dia, -3))).toBe('2026-07-12');
    });
  });

  describe('resolveZone', () => {
    it('devuelve la zona fija de Lima sin construir nada', () => {
      expect(resolveZone('America/Lima')).toBe(LIMA_ZONE);
    });

    it('reutiliza la misma instancia por nombre', () => {
      expect(resolveZone('Europe/Madrid')).toBe(resolveZone('Europe/Madrid'));
    });

    it('una zona inválida o vacía cae a la de por defecto', () => {
      expect(resolveZone('no-existe')).toBe(LIMA_ZONE);
      expect(resolveZone('')).toBe(LIMA_ZONE);
      expect(resolveZone(null)).toBe(LIMA_ZONE);
    });

    it('Lima y su equivalente IANA dan la misma hora local', () => {
      const utc = new Date('2026-09-14T03:00:00.000Z');
      expect(new IanaZone('America/Lima').toLocalIso(utc)).toBe(
        LIMA_ZONE.toLocalIso(utc),
      );
    });
  });
});
