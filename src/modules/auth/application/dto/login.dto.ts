import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'ana@ejemplo.com' })
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'La contraseña es obligatoria' })
  @MaxLength(128)
  password: string;
}
