import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { CLOSE_STATUSES, CloseStatus } from '../../domain/enum';

export class CloseIntentionDto {
  @ApiProperty({
    enum: CLOSE_STATUSES as CloseStatus[],
    description: 'Cómo terminó la intención. PENDING no es un cierre válido',
  })
  @IsIn(CLOSE_STATUSES as CloseStatus[], {
    message: `El estado debe ser uno de: ${CLOSE_STATUSES.join(', ')}`,
  })
  status: CloseStatus;
}
