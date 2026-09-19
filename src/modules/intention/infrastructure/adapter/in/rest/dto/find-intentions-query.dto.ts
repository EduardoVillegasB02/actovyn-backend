import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  FILTERABLE_STATUSES,
  IntentionStatus,
} from 'src/modules/intention/domain/enum';
import { FindIntentionsDto } from 'src/modules/intention/application/dto';
import {
  IntentionSort,
  SortOrder,
} from 'src/modules/intention/application/port/out';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

const SORTS: IntentionSort[] = ['scheduled_at', 'created_at'];
const ORDERS: SortOrder[] = ['asc', 'desc'];

/** 'a' -> ['a']; ausente -> []. Un query param repetido ya llega como array. */
const toArray = ({ value }: { value: unknown }): unknown[] =>
  value === undefined || value === null
    ? []
    : Array.isArray(value)
      ? value
      : [value];

const toBoolean = ({ value }: { value: unknown }): boolean =>
  value === true || value === 'true' || value === '1';

/**
 * Los parámetros de consulta, en snake_case porque son el contrato HTTP.
 * Se traducen a FindIntentionsDto, que ya va en camelCase como el resto.
 */
export class FindIntentionsQueryDto {
  @ApiPropertyOptional({
    enum: FILTERABLE_STATUSES as IntentionStatus[],
    isArray: true,
    description: 'Repetible: status=FAILED&status=CANCELLED',
  })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsIn(FILTERABLE_STATUSES as IntentionStatus[], { each: true })
  status?: IntentionStatus[];

  @ApiPropertyOptional({ description: 'ISO. Filtra por scheduled_at' })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'from debe ser una fecha ISO' })
  from?: Date;

  @ApiPropertyOptional({ description: 'ISO. Filtra por scheduled_at' })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'to debe ser una fecha ISO' })
  to?: Date;

  @ApiPropertyOptional({
    description: 'ISO. Para el check-in: pendientes cuya hora ya pasó',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'scheduled_before debe ser una fecha ISO' })
  scheduled_before?: Date;

  @ApiPropertyOptional({ example: 'trabajo' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @ApiPropertyOptional({ description: 'Texto libre sobre el objetivo' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({ enum: SORTS, default: 'created_at' })
  @IsOptional()
  @IsIn(SORTS)
  sort?: IntentionSort;

  @ApiPropertyOptional({ enum: ORDERS, default: 'desc' })
  @IsOptional()
  @IsIn(ORDERS)
  order?: SortOrder;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;

  @ApiPropertyOptional({ description: 'Opaco, del next_cursor anterior' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  cursor?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  include_drafts?: boolean;

  toFilter(): FindIntentionsDto {
    return {
      statuses: this.status ?? [],
      from: this.from ?? null,
      to: this.to ?? null,
      scheduledBefore: this.scheduled_before ?? null,
      category: this.category?.trim().toLowerCase() || null,
      query: this.q?.trim() || null,
      sort: this.sort ?? 'created_at',
      order: this.order ?? 'desc',
      limit: this.limit ?? DEFAULT_PAGE_SIZE,
      cursor: this.cursor ?? null,
      includeDrafts: this.include_drafts ?? false,
    };
  }
}
