import { Body, Controller, Get, Inject, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthPayload } from 'src/modules/auth/application/port/out';
import { CurrentUser } from 'src/modules/auth/infrastructure/adapter/in/rest/decorator/current-user.decorator';
import {
  FIND_USER_PORT,
  FindUserPort,
  UPDATE_USER_PORT,
  UpdateUserPort,
} from 'src/modules/user/application/port/in';
import { UpdateUserHttpDto } from './dto/update-user-http.dto';
import { UserHttpMapper, UserHttpResponse } from './mapper/user-http.mapper';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(
    @Inject(FIND_USER_PORT)
    private readonly findUser: FindUserPort,
    @Inject(UPDATE_USER_PORT)
    private readonly updateUser: UpdateUserPort,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'La cuenta de la sesión actual' })
  async me(@CurrentUser() current: AuthPayload): Promise<UserHttpResponse> {
    return UserHttpMapper.toHttp(await this.findUser.findById(current.sub));
  }

  @Patch('me')
  @ApiOperation({ summary: 'Cambia el nombre visible o la zona horaria' })
  async update(
    @CurrentUser() current: AuthPayload,
    @Body() dto: UpdateUserHttpDto,
  ): Promise<UserHttpResponse> {
    return UserHttpMapper.toHttp(
      await this.updateUser.execute(current.sub, dto.toApplication()),
    );
  }
}
