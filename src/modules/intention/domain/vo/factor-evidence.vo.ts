import { ValueObject } from 'src/shared/domain/vo';
import { COUNTABLE_FACTOR_KEYS, CountableFactorKey } from '../enum';

export type EvidenceMap = Record<CountableFactorKey, number>;

/**
 * Cuántas observaciones reales respaldan cada factor contable.
 *
 * Sin esto, un 25 sacado de una sola tarea pesaría igual que un 25 sacado de
 * ocho. Es lo que autoriza al guard rail a acusar: sin evidencia no acusa.
 */
export class FactorEvidence extends ValueObject<EvidenceMap> {
  private constructor(props: EvidenceMap) {
    super(props);
  }

  static create(evidence: Partial<EvidenceMap>): FactorEvidence {
    const counts = {} as EvidenceMap;
    for (const key of COUNTABLE_FACTOR_KEYS)
      counts[key] = Math.max(0, Math.trunc(evidence[key] ?? 0));
    return new FactorEvidence(counts);
  }

  static empty(): FactorEvidence {
    return FactorEvidence.create({});
  }

  of(key: CountableFactorKey): number {
    return this.props[key];
  }

  /** Un factor solo es contable si alguna vez se observó. */
  has(key: CountableFactorKey): boolean {
    return this.props[key] > 0;
  }

  toRecord(): EvidenceMap {
    return { ...this.props };
  }
}
