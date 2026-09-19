/**
 * Franjas del día. El motor no razona hora por hora: con 30 registros por
 * usuario, 24 cortes no tendrían muestra. Cinco franjas sí.
 */
export enum HourBand {
  MADRUGADA = 'MADRUGADA',
  MANANA = 'MANANA',
  TARDE = 'TARDE',
  NOCHE = 'NOCHE',
  NOCTURNO = 'NOCTURNO',
}
