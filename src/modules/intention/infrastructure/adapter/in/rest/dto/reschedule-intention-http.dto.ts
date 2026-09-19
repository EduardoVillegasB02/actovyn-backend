import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';
import { RescheduleIntentionDto } from 'src/modules/intention/application/dto';

export class RescheduleIntentionHttpDto {
  @ApiProperty({
    example: '2026-09-19T00:00:00.000Z',
    description: 'La hora nueva, en UTC. Tiene que estar en el futuro',
  })
  @Type(() => Date)
  @IsDate({ message: 'scheduled_at debe ser una fecha ISO' })
  scheduled_at: Date;

  toApplication(): RescheduleIntentionDto {
    return { scheduledAt: this.scheduled_at };
  }
}
