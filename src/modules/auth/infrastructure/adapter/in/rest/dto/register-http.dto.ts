import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RegisterDto } from 'src/modules/auth/application/dto';
import { Password } from 'src/modules/user/domain/vo';

/**
 * El cuerpo tal como lo manda el cliente, en snake_case. La validación vive
 * aquí, en la frontera, y la aplicación recibe ya su forma en camelCase.
 */
export class RegisterHttpDto {
  @ApiProperty({ example: 'ana@ejemplo.com' })
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  email: string;

  @ApiProperty({ minLength: Password.MIN_LENGTH })
  @IsString()
  @MinLength(Password.MIN_LENGTH, {
    message: `La contraseña debe tener al menos ${Password.MIN_LENGTH} caracteres`,
  })
  @MaxLength(128)
  password: string;

  @ApiProperty({ example: 'Ana' })
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio' })
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ example: 'Torres' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastname?: string;

  @ApiProperty({
    example: 'America/Lima',
    description: 'IANA. La manda el navegador con Intl.DateTimeFormat',
  })
  @IsString()
  @MinLength(1, { message: 'La zona horaria es obligatoria' })
  timezone: string;

  toApplication(): RegisterDto {
    return {
      email: this.email,
      password: this.password,
      name: this.name,
      lastname: this.lastname ?? '',
      timezone: this.timezone,
    };
  }
}
