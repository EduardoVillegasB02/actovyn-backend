import { ValueObject } from 'src/shared/domain/vo';
import { clamp } from 'src/shared/util/number.util';
import { FACTOR_KEYS, FactorKey } from '../enum';

export type FactorMap = Record<FactorKey, number>;

/**
 * Los 5 factores, cada uno 0-100. Se acotan al construirse, así ninguna capa
 * de abajo tiene que volver a desconfiar del rango.
 */
export class ScoreFactors extends ValueObject<FactorMap> {
  private constructor(props: FactorMap) {
    super(props);
  }

  static create(factors: FactorMap): ScoreFactors {
    const clamped = {} as FactorMap;
    for (const key of FACTOR_KEYS) clamped[key] = clamp(factors[key]);
    return new ScoreFactors(clamped);
  }

  of(key: FactorKey): number {
    return this.props[key];
  }

  get historicalAdherence(): number {
    return this.props[FactorKey.HISTORICAL_ADHERENCE];
  }

  get timeCompatibility(): number {
    return this.props[FactorKey.TIME_COMPATIBILITY];
  }

  get difficultyFit(): number {
    return this.props[FactorKey.DIFFICULTY_FIT];
  }

  get recentConsistency(): number {
    return this.props[FactorKey.RECENT_CONSISTENCY];
  }

  get linguisticConfidence(): number {
    return this.props[FactorKey.LINGUISTIC_CONFIDENCE];
  }

  toRecord(): FactorMap {
    return { ...this.props };
  }
}
