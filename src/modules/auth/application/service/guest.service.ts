import { Inject, Injectable } from '@nestjs/common';
import { Id } from 'src/shared/domain/vo';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from 'src/modules/user/application/port/out';
import { User } from 'src/modules/user/domain/entity';
import { Timezone } from 'src/modules/user/domain/vo';
import { GuestDto, SessionResponseDto } from '../dto';
import { GuestPort } from '../port/in/auth.port';
import { SessionIssuer } from './session-issuer.service';

/**
 * Cuenta sin formulario. Existe porque el producto solo se entiende usándolo:
 * pedir registro antes de que alguien vea su primer score pierde a la mitad.
 * El registro llega después y convierte esta cuenta sin perder nada.
 */
@Injectable()
export class GuestService implements GuestPort {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    private readonly sessions: SessionIssuer,
  ) {}

  async execute(dto: GuestDto): Promise<SessionResponseDto> {
    const user = User.guest(Id.generate(), Timezone.create(dto.timezone));
    await this.userRepository.save(user);
    return this.sessions.issue(user);
  }
}
