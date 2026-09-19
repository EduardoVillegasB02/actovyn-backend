import { ValueObject } from 'src/shared/domain/vo';
import { InvalidInputException } from 'src/shared/domain/exception';
import { DEFAULT_WEIGHTS } from '../constant';
import { FACTOR_KEYS, FactorKey } from '../enum';

export type WeightMap = Record<FactorKey, number>;

/**
 * Cuánto pesa cada factor. Invariante: suman 1.
 * Se guarda junto a cada predicción, así un score viejo sigue siendo
 * explicable aunque mañana se reajusten los pesos.
 */
export class ScoreWeights extends ValueObject<WeightMap> {
  /** Tolerancia de punto flotante: 0.35 + 0.25 + 0.2 + 0.1 + 0.1 no da 1 exacto. */
  private static readonly EPSILON = 1e-6;

  private constructor(props: WeightMap) {
    super(props);
  }

  static create(weights: WeightMap): ScoreWeights {
    const sum = FACTOR_KEYS.reduce((acc, key) => acc + weights[key], 0);
    if (Math.abs(sum - 1) > ScoreWeights.EPSILON)
      throw new InvalidInputException(`Los pesos deben sumar 1 (suman ${sum})`);
    return new ScoreWeights({ ...weights });
  }

  static default(): ScoreWeights {
    return ScoreWeights.create({ ...DEFAULT_WEIGHTS });
  }

  of(key: FactorKey): number {
    return this.props[key];
  }

  toRecord(): WeightMap {
    return { ...this.props };
  }
}
