import {
  AnalyzeIntentionDto,
  CloseIntentionDto,
  FindIntentionsDto,
  FindStatsDto,
  IntentionAnalysisResponseDto,
  IntentionPageResponseDto,
  IntentionResponseDto,
  RescheduleIntentionDto,
  RescheduleResponseDto,
  StatsResponseDto,
} from '../../dto';

export interface AnalyzeIntentionPort {
  /** `now` es inyectable para que el caso de uso se pueda testear. */
  execute(
    dto: AnalyzeIntentionDto,
    userId: string,
    now?: Date,
  ): Promise<IntentionAnalysisResponseDto>;
}

export interface CommitIntentionPort {
  execute(id: string, userId: string): Promise<IntentionResponseDto>;
}

export interface CloseIntentionPort {
  execute(
    id: string,
    userId: string,
    dto: CloseIntentionDto,
  ): Promise<IntentionResponseDto>;
}

export interface DiscardIntentionPort {
  execute(id: string, userId: string): Promise<void>;
}

export interface FindIntentionPort {
  findPage(
    userId: string,
    dto: FindIntentionsDto,
  ): Promise<IntentionPageResponseDto>;
  findById(id: string, userId: string): Promise<IntentionResponseDto>;
}

export interface RescheduleIntentionPort {
  execute(
    id: string,
    userId: string,
    dto: RescheduleIntentionDto,
    now?: Date,
  ): Promise<RescheduleResponseDto>;
}

export interface FindStatsPort {
  execute(
    userId: string,
    dto: FindStatsDto,
    now?: Date,
  ): Promise<StatsResponseDto>;
}

export const ANALYZE_INTENTION_PORT = Symbol('AnalyzeIntentionPort');
export const RESCHEDULE_INTENTION_PORT = Symbol('RescheduleIntentionPort');
export const FIND_STATS_PORT = Symbol('FindStatsPort');
export const COMMIT_INTENTION_PORT = Symbol('CommitIntentionPort');
export const CLOSE_INTENTION_PORT = Symbol('CloseIntentionPort');
export const DISCARD_INTENTION_PORT = Symbol('DiscardIntentionPort');
export const FIND_INTENTION_PORT = Symbol('FindIntentionPort');
