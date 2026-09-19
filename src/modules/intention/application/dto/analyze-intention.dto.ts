import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AnalyzeIntentionDto {
  @ApiProperty({
    example: 'Mañana termino el informe a las 11pm',
    description: 'El compromiso, tal como lo escribe el usuario',
  })
  @IsString()
  @MinLength(3, { message: 'El mensaje es demasiado corto' })
  @MaxLength(500, { message: 'El mensaje no puede pasar de 500 caracteres' })
  message: string;
}
