import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MINUTE_MS } from 'src/shared/constants/time.contant';
import { AuthPayload } from 'src/modules/auth/application/port/out';
import { CurrentUser } from 'src/modules/auth/infrastructure/adapter/in/rest/decorator/current-user.decorator';
import {
  AnalyzeIntentionDto,
  CloseIntentionDto,
} from 'src/modules/intention/application/dto';
import {
  ANALYZE_INTENTION_PORT,
  AnalyzeIntentionPort,
  CLOSE_INTENTION_PORT,
  CloseIntentionPort,
  COMMIT_INTENTION_PORT,
  CommitIntentionPort,
  DISCARD_INTENTION_PORT,
  DiscardIntentionPort,
  FIND_INTENTION_PORT,
  FindIntentionPort,
  RESCHEDULE_INTENTION_PORT,
  RescheduleIntentionPort,
} from 'src/modules/intention/application/port/in';
import { FindIntentionsQueryDto } from './dto/find-intentions-query.dto';
import { RescheduleIntentionHttpDto } from './dto/reschedule-intention-http.dto';
import {
  AnalyzeIntentionHttpResponse,
  IntentionHttpMapper,
  IntentionHttpResponse,
  IntentionPageHttpResponse,
  RescheduleHttpResponse,
} from './mapper/intention-http.mapper';

/** Cuántos análisis puede pedir una persona, y en cuánto tiempo. */
export const ANALYZE_LIMIT = 20;
export const ANALYZE_WINDOW_MS = 10 * MINUTE_MS;

@ApiTags('intentions')
@ApiBearerAuth()
@Controller('intentions')
export class IntentionController {
  constructor(
    @Inject(ANALYZE_INTENTION_PORT)
    private readonly analyzeIntention: AnalyzeIntentionPort,
    @Inject(COMMIT_INTENTION_PORT)
    private readonly commitIntention: CommitIntentionPort,
    @Inject(CLOSE_INTENTION_PORT)
    private readonly closeIntention: CloseIntentionPort,
    @Inject(DISCARD_INTENTION_PORT)
    private readonly discardIntention: DiscardIntentionPort,
    @Inject(FIND_INTENTION_PORT)
    private readonly findIntention: FindIntentionPort,
    @Inject(RESCHEDULE_INTENTION_PORT)
    private readonly rescheduleIntention: RescheduleIntentionPort,
  ) {}

  // Analizar cuesta una llamada al modelo, así que tiene su propio cupo, más
  // estrecho que el general. Se cuenta por usuario, no por dirección IP.
  @Throttle({ default: { limit: ANALYZE_LIMIT, ttl: ANALYZE_WINDOW_MS } })
  @Post('analyze')
  @ApiOperation({
    summary:
      'Analiza, predice y recomienda. Crea un BORRADOR, no un compromiso',
  })
  async analyze(
    @Body() dto: AnalyzeIntentionDto,
    @CurrentUser() current: AuthPayload,
  ): Promise<AnalyzeIntentionHttpResponse> {
    return IntentionHttpMapper.toAnalyzeHttp(
      await this.analyzeIntention.execute(dto, current.sub),
    );
  }

  @Post(':id/commit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Me comprometo: el borrador pasa a PENDING' })
  async commit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() current: AuthPayload,
  ): Promise<IntentionHttpResponse> {
    return IntentionHttpMapper.toHttp(
      await this.commitIntention.execute(id, current.sub),
    );
  }

  // Vuelve a llamar al motor, así que va con el mismo cupo que analizar.
  @Throttle({ default: { limit: ANALYZE_LIMIT, ttl: ANALYZE_WINDOW_MS } })
  @Post(':id/reschedule')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mueve la hora y vuelve a predecir, con el score anterior',
  })
  async reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleIntentionHttpDto,
    @CurrentUser() current: AuthPayload,
  ): Promise<RescheduleHttpResponse> {
    return IntentionHttpMapper.toRescheduleHttp(
      await this.rescheduleIntention.execute(
        id,
        current.sub,
        dto.toApplication(),
      ),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Descarta un borrador' })
  async discard(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() current: AuthPayload,
  ): Promise<void> {
    await this.discardIntention.execute(id, current.sub);
  }

  @Get()
  @ApiOperation({
    summary: 'Historial filtrable y paginado. Excluye borradores por defecto',
  })
  async list(
    @Query() query: FindIntentionsQueryDto,
    @CurrentUser() current: AuthPayload,
  ): Promise<IntentionPageHttpResponse> {
    return IntentionHttpMapper.toPageHttp(
      await this.findIntention.findPage(current.sub, query.toFilter()),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle con todas sus predicciones' })
  async detail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() current: AuthPayload,
  ): Promise<IntentionHttpResponse> {
    return IntentionHttpMapper.toHttp(
      await this.findIntention.findById(id, current.sub),
    );
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Cierra la intención: cumplí, fallé, reprogramé' })
  async close(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseIntentionDto,
    @CurrentUser() current: AuthPayload,
  ): Promise<IntentionHttpResponse> {
    return IntentionHttpMapper.toHttp(
      await this.closeIntention.execute(id, current.sub, dto),
    );
  }
}
