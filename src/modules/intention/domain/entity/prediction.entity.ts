import { Id } from 'src/shared/domain/vo';
import { MODEL_VERSION } from '../constant';
import { ConfidenceLevel, FactorKey, RiskLevel } from '../enum';
import { CommitmentScoreService } from '../service/commitment-score.service';
import { FactorEvidence, ScoreFactors, ScoreWeights } from '../vo';

/**
 * El resultado del motor para UNA intención: score, riesgo, confianza y el
 * rastro completo de cómo se llegó ahí.
 *
 * Guarda los pesos usados a propósito. Si mañana se reajustan, una predicción
 * vieja se sigue pudiendo explicar con los que la produjeron.
 */
export class Prediction {
  private constructor(
    private readonly _id: Id,
    private readonly _commitmentScore: number,
    private readonly _risk: RiskLevel,
    private readonly _confidence: ConfidenceLevel,
    private readonly _sampleSize: number,
    private readonly _factors: ScoreFactors,
    private readonly _evidence: FactorEvidence,
    private readonly _weights: ScoreWeights,
    private readonly _cappedBy: readonly FactorKey[],
    private readonly _modelVersion: string,
  ) {}

  /** Compone: media ponderada -> guard rail -> riesgo -> confianza. */
  static build(
    factors: ScoreFactors,
    sampleSize: number,
    evidence: FactorEvidence,
    weights: ScoreWeights = ScoreWeights.default(),
    id: Id = Id.generate(),
  ): Prediction {
    const base = CommitmentScoreService.compute(factors, weights);
    const guarded = CommitmentScoreService.applyGuardRails(
      base,
      factors,
      evidence,
      weights,
    );
    return new Prediction(
      id,
      guarded.score,
      CommitmentScoreService.classifyRisk(guarded.score),
      CommitmentScoreService.classifyConfidence(sampleSize),
      sampleSize,
      factors,
      evidence,
      weights,
      guarded.cappedBy,
      MODEL_VERSION,
    );
  }

  /** ¿El guard rail topó este score? */
  get capped(): boolean {
    return this._cappedBy.length > 0;
  }

  get id(): Id {
    return this._id;
  }

  get commitmentScore(): number {
    return this._commitmentScore;
  }

  get risk(): RiskLevel {
    return this._risk;
  }

  get confidence(): ConfidenceLevel {
    return this._confidence;
  }

  get sampleSize(): number {
    return this._sampleSize;
  }

  get factors(): ScoreFactors {
    return this._factors;
  }

  get evidence(): FactorEvidence {
    return this._evidence;
  }

  get weights(): ScoreWeights {
    return this._weights;
  }

  get cappedBy(): readonly FactorKey[] {
    return this._cappedBy;
  }

  get modelVersion(): string {
    return this._modelVersion;
  }
}
