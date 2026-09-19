import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UpdateUserDto } from 'src/modules/user/application/dto';

export class UpdateUserHttpDto {
  @ApiPropertyOptional({ example: 'Ana' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ example: 'Torres' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastname?: string;

  @ApiPropertyOptional({
    example: 'America/Lima',
    description: 'IANA. Con ella se calcula la hora local de cada intención',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  /** Solo se copian las claves presentes: un PATCH parcial de verdad. */
  toApplication(): UpdateUserDto {
    const dto: UpdateUserDto = {};
    if (this.name !== undefined) dto.name = this.name;
    if (this.lastname !== undefined) dto.lastname = this.lastname;
    if (this.timezone !== undefined) dto.timezone = this.timezone;
    return dto;
  }
}
