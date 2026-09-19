import { PredictionSnapshotDto } from './intention-analysis-response.dto';
import { IntentionResponseDto } from './intention-response.dto';

/** Nueva hora del compromiso, en UTC. */
export class RescheduleIntentionDto {
  scheduledAt: Date;
}

export class RescheduleResponseDto {
  /** La resultante: la misma si era borrador, otra si ya estaba asumida. */
  intention: IntentionResponseDto;
  /** La predicción recalculada con la hora nueva. */
  prediction: PredictionSnapshotDto;
  /** El score anterior, para poder enseñar el salto. null si no había. */
  previousScore: number | null;
}
