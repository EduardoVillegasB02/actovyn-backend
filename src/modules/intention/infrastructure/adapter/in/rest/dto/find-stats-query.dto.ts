import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';
import { FindStatsDto } from 'src/modules/intention/application/dto';

export class FindStatsQueryDto {
  @ApiPropertyOptional({ description: 'ISO. Por defecto, 12 semanas atrás' })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'from debe ser una fecha ISO' })
  from?: Date;

  @ApiPropertyOptional({ description: 'ISO. Por defecto, ahora' })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'to debe ser una fecha ISO' })
  to?: Date;

  toApplication(): FindStatsDto {
    return { from: this.from ?? null, to: this.to ?? null };
  }
}
