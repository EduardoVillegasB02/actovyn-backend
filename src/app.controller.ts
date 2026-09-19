import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './modules/auth/infrastructure/adapter/in/rest/decorator/public.decorator';
import { AppService, HealthStatus } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Sin token: lo consulta el despliegue, que no tiene sesión.
  @Public()
  @Get()
  @ApiOperation({ summary: 'Señal de vida del servicio' })
  health(): HealthStatus {
    return this.appService.health();
  }
}
