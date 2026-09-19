import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class GuestDto {
  @ApiProperty({ example: 'America/Lima', description: 'IANA' })
  @IsString()
  @MinLength(1, { message: 'La zona horaria es obligatoria' })
  timezone: string;
}
