import { Inject, Injectable } from '@nestjs/common';
import { Id } from 'src/shared/domain/vo';
import {
  PASSWORD_HASHER_PORT,
  PasswordHasherPort,
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from 'src/modules/user/application/port/out';
import { User } from 'src/modules/user/domain/entity';
import { EmailAlreadyExistsException } from 'src/modules/user/domain/exception';
import { Email, Password, Timezone } from 'src/modules/user/domain/vo';
import { RegisterDto, SessionResponseDto } from '../dto';
import { RegisterPort } from '../port/in/auth.port';
import { SessionIssuer } from './session-issuer.service';

@Injectable()
export class RegisterService implements RegisterPort {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    private readonly sessions: SessionIssuer,
  ) {}

  async execute(
    dto: RegisterDto,
    guestUserId?: string,
  ): Promise<SessionResponseDto> {
    const email = Email.create(dto.email);
    const timezone = Timezone.create(dto.timezone);

    if (await this.userRepository.existsByEmail(email))
      throw new EmailAlreadyExistsException();

    Password.assertStrength(dto.password);
    const password = Password.fromHash(
      await this.passwordHasher.hash(dto.password),
    );

    const user =
      (await this.promoteGuest(guestUserId, email, password, dto)) ??
      User.register(
        Id.generate(),
        email,
        password,
        dto.name,
        dto.lastname,
        timezone,
      );

    await this.userRepository.save(user);
    return this.sessions.issue(user);
  }

  /**
   * Si quien se registra venía usando el producto como invitado, su cuenta se
   * convierte en vez de crear otra: así no pierde el historial que ya le da
   * sentido al score.
   *
   * Un token que no sea de invitado se ignora y se crea una cuenta nueva.
   */
  private async promoteGuest(
    guestUserId: string | undefined,
    email: Email,
    password: Password,
    dto: RegisterDto,
  ): Promise<User | null> {
    if (!guestUserId) return null;

    const guest = await this.userRepository.findById(Id.create(guestUserId));
    if (!guest || !guest.isGuest) return null;

    guest.promote(email, password, dto.name, dto.lastname);
    guest.changeTimezone(Timezone.create(dto.timezone));
    return guest;
  }
}
