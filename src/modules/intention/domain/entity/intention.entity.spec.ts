/**
 * El ciclo de vida es la regla de negocio que separa "lo probé" de "lo voy a
 * hacer". Si se rompe, el historial se llena de análisis sueltos y el motor
 * aprende de cosas que nadie llegó a asumir.
 */
import {
  ConflictException,
  ForbiddenException,
  InvalidInputException,
} from 'src/shared/domain/exception';
import { Id } from 'src/shared/domain/vo';
import { LIMA_ZONE } from 'src/shared/util/zone.util';
import { IanaZone } from 'src/shared/util/iana-zone.util';
import { Zone } from 'src/shared/util/zone.interface';
import { Difficulty, IntentionStatus } from '../enum';
import { Intention } from './intention.entity';

describe('Intention', () => {
  const owner = Id.generate();
  const otherUser = Id.generate();

  const build = (scheduledAt: Date | null = null, zone: Zone = LIMA_ZONE) =>
    Intention.create(
      Id.generate(),
      owner,
      'Terminar el informe',
      'Trabajo',
      'Mañana termino el informe a las 11pm',
      Difficulty.HIGH,
      scheduledAt,
      zone,
    );

  describe('al nacer', () => {
    it('es un borrador, no un compromiso', () => {
      const intention = build();
      expect(intention.status).toBe(IntentionStatus.DRAFT);
      expect(intention.isDraft).toBe(true);
      expect(intention.isClosed).toBe(false);
    });

    it('normaliza el objetivo y la categoría', () => {
      expect(build().category).toBe('trabajo');
    });

    it('rechaza un objetivo vacío', () => {
      expect(() =>
        Intention.create(
          Id.generate(),
          owner,
          '   ',
          null,
          'mensaje',
          Difficulty.LOW,
          null,
          LIMA_ZONE,
        ),
      ).toThrow(InvalidInputException);
    });

    it('sin hora no inventa hora local ni día de la semana', () => {
      const intention = build();
      expect(intention.localHour).toBeNull();
      expect(intention.weekday).toBeNull();
    });

    it('deriva la hora local en la zona del usuario, no en la del servidor', () => {
      const madrid = new IanaZone('Europe/Madrid');
      const instant = madrid.toUtc('2026-07-15T22:00:00');

      expect(build(instant, madrid).localHour).toBe(22);
      // El mismo instante es otra hora para alguien en Lima.
      expect(build(instant, LIMA_ZONE).localHour).toBe(15);
    });
  });

  describe('comprometerse', () => {
    it('lleva el borrador a pendiente', () => {
      const intention = build();
      intention.commit();
      expect(intention.status).toBe(IntentionStatus.PENDING);
      expect(intention.isDraft).toBe(false);
    });

    it('no se puede asumir dos veces', () => {
      const intention = build();
      intention.commit();
      expect(() => intention.commit()).toThrow(ConflictException);
    });
  });

  describe('cerrar', () => {
    it('marca el estado final y sella la fecha', () => {
      const intention = build();
      intention.commit();
      intention.close(IntentionStatus.COMPLETED);

      expect(intention.status).toBe(IntentionStatus.COMPLETED);
      expect(intention.closedAt).not.toBeNull();
      expect(intention.isClosed).toBe(true);
    });

    it('un borrador no se cierra: o se asume, o se descarta', () => {
      expect(() => build().close(IntentionStatus.COMPLETED)).toThrow(
        ConflictException,
      );
    });

    it('no se cierra dos veces, porque reabrir falsearía el historial', () => {
      const intention = build();
      intention.commit();
      intention.close(IntentionStatus.FAILED);
      expect(() => intention.close(IntentionStatus.COMPLETED)).toThrow(
        ConflictException,
      );
    });
  });

  describe('reprogramar', () => {
    const laNoche = LIMA_ZONE.toUtc('2026-09-20T23:00:00');
    const laTarde = LIMA_ZONE.toUtc('2026-09-20T19:00:00');

    it('un borrador cambia de hora en el sitio y recalcula lo derivado', () => {
      const intention = build(laNoche);
      expect(intention.localHour).toBe(23);

      intention.reschedule(laTarde, LIMA_ZONE);

      expect(intention.scheduledAt).toEqual(laTarde);
      expect(intention.localHour).toBe(19);
      expect(intention.weekday).toBe(0);
      // Sigue siendo el mismo borrador: no nace nada nuevo.
      expect(intention.status).toBe(IntentionStatus.DRAFT);
    });

    it('lo ya asumido no se edita en el sitio', () => {
      const intention = build(laNoche);
      intention.commit();
      expect(() => intention.reschedule(laTarde, LIMA_ZONE)).toThrow(
        ConflictException,
      );
    });

    it('reprogramar un compromiso crea otra intención que apunta a la vieja', () => {
      const original = build(laNoche);
      original.commit();

      const nueva = Intention.rescheduleFrom(
        original,
        Id.generate(),
        laTarde,
        LIMA_ZONE,
      );

      expect(nueva.status).toBe(IntentionStatus.PENDING);
      expect(nueva.localHour).toBe(19);
      expect(nueva.rescheduledFromId?.value).toBe(original.id.value);
      expect(nueva.objective).toBe(original.objective);
      // La original no se toca aquí: la cierra el servicio.
      expect(original.status).toBe(IntentionStatus.PENDING);
    });

    it('una intención cerrada ya no se reprograma', () => {
      const intention = build(laNoche);
      intention.commit();
      intention.close(IntentionStatus.COMPLETED);
      expect(() => intention.assertReschedulable()).toThrow(ConflictException);
    });

    it('un borrador y un pendiente sí admiten reprogramación', () => {
      const borrador = build(laNoche);
      expect(() => borrador.assertReschedulable()).not.toThrow();

      borrador.commit();
      expect(() => borrador.assertReschedulable()).not.toThrow();
    });
  });

  describe('descartar', () => {
    it('solo se permite mientras sea borrador', () => {
      expect(() => build().assertDiscardable()).not.toThrow();
    });

    it('lo asumido se cancela, no se borra', () => {
      const intention = build();
      intention.commit();
      expect(() => intention.assertDiscardable()).toThrow(ConflictException);
    });
  });

  describe('propiedad', () => {
    it('deja pasar a su dueño', () => {
      expect(() => build().assertOwnedBy(owner)).not.toThrow();
    });

    it('bloquea a cualquier otro aunque acierte el id', () => {
      expect(() => build().assertOwnedBy(otherUser)).toThrow(
        ForbiddenException,
      );
    });
  });
});
