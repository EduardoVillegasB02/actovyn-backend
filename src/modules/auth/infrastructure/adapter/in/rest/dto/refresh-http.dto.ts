import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * El refresh viaja normalmente en una cookie httpOnly. Este campo existe para
 * cuando la web y el API están en dominios distintos y la cookie no se puede
 * usar: ver AUTH_REFRESH_IN_BODY.
 */
export class RefreshHttpDto {
  @ApiPropertyOptional({ description: 'Solo si no se usa la cookie httpOnly' })
  @IsOptional()
  @IsString()
  refresh_token?: string;
}
