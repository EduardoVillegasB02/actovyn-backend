import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthPayload } from 'src/modules/auth/application/port/out';
import { CurrentUser } from 'src/modules/auth/infrastructure/adapter/in/rest/decorator/current-user.decorator';
import {
  FIND_STATS_PORT,
  FindStatsPort,
} from 'src/modules/intention/application/port/in';
import { FindStatsQueryDto } from './dto/find-stats-query.dto';
import { StatsHttpMapper, StatsHttpResponse } from './mapper/stats-http.mapper';

@ApiTags('stats')
@ApiBearerAuth()
@Controller('stats')
export class StatsController {
  constructor(
    @Inject(FIND_STATS_PORT)
    private readonly findStats: FindStatsPort,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Panel de patrones y calibración. Por defecto, 12 semanas',
  })
  async stats(
    @Query() query: FindStatsQueryDto,
    @CurrentUser() current: AuthPayload,
  ): Promise<StatsHttpResponse> {
    return StatsHttpMapper.toHttp(
      await this.findStats.execute(current.sub, query.toApplication()),
    );
  }
}
