import { Inject, Injectable } from '@nestjs/common';
import {
  PASSWORD_HASHER_PORT,
  PasswordHasherPort,
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from 'src/modules/user/application/port/out';
import { Email } from 'src/modules/user/domain/vo';
import { InvalidCredentialsException } from '../../domain/exception';
import { LoginDto, SessionResponseDto } from '../dto';
import { LoginPort } from '../port/in/auth.port';
import { SessionIssuer } from './session-issuer.service';

@Injectable()
export class LoginService implements LoginPort {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    private readonly sessions: SessionIssuer,
  ) {}

  async execute(dto: LoginDto): Promise<SessionResponseDto> {
    const user = await this.userRepository.findByEmail(Email.create(dto.email));

    // Un invitado no tiene contraseña con la que entrar, y responde igual que
    // un email que no existe: fuera no se distingue un caso del otro.
    if (!user?.canSignIn) throw new InvalidCredentialsException();

    const matches = await this.passwordHasher.compare(
      user.password!.hash,
      dto.password,
    );
    if (!matches) throw new InvalidCredentialsException();

    return this.sessions.issue(user);
  }
}
