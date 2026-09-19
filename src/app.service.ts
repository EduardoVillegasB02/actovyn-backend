import { Injectable } from '@nestjs/common';

export interface HealthStatus {
  status: 'ok';
  service: string;
  timestamp: string;
}

@Injectable()
export class AppService {
  /** Señal de vida para el despliegue y para comprobar CORS desde el front. */
  health(): HealthStatus {
    return {
      status: 'ok',
      service: 'hackedu-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
