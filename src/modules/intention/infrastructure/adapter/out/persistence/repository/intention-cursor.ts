import { validate as isUuid } from 'uuid';

/**
 * El cursor es opaco a propósito: por fuera es una cadena sin significado, y
 * eso deja libertad para cambiar la paginación sin romper a quien la use.
 * Hoy dentro solo va el id de la última fila de la página.
 */
export class IntentionCursor {
  static encode(id: string): string {
    return Buffer.from(id, 'utf8').toString('base64url');
  }

  /** Un cursor manipulado o caducado se ignora: se vuelve a la primera página. */
  static decode(cursor: string | null): string | null {
    if (!cursor) return null;
    try {
      const id = Buffer.from(cursor, 'base64url').toString('utf8');
      return isUuid(id) ? id : null;
    } catch {
      return null;
    }
  }
}
