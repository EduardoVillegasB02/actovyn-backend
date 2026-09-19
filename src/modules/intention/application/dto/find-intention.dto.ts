import {
  IntentionSort,
  SortOrder,
} from '../port/out/intention-repository.port';
import { IntentionStatus } from '../../domain/enum';

/** Los filtros ya validados y normalizados, tal como los usa la aplicación. */
export class FindIntentionsDto {
  statuses: IntentionStatus[];
  from: Date | null;
  to: Date | null;
  scheduledBefore: Date | null;
  category: string | null;
  query: string | null;
  sort: IntentionSort;
  order: SortOrder;
  limit: number;
  cursor: string | null;
  includeDrafts: boolean;
}
