import { Inject, Injectable } from '@nestjs/common';
import { Id } from 'src/shared/domain/vo';
import { UserNotFoundException } from '../../domain/exception';
import { Timezone } from '../../domain/vo';
import { UpdateUserDto, UserResponseDto } from '../dto';
import { UserResponseMapper } from '../mapper';
import { UpdateUserPort } from '../port/in/user.port';
import { USER_REPOSITORY_PORT, UserRepositoryPort } from '../port/out';

@Injectable()
export class UpdateUserService implements UpdateUserPort {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(Id.create(id));
    if (!user) throw new UserNotFoundException();

    // Parcial de verdad: lo que no viene, no se toca.
    if (dto.name !== undefined || dto.lastname !== undefined)
      user.rename(dto.name, dto.lastname);
    if (dto.timezone !== undefined)
      user.changeTimezone(Timezone.create(dto.timezone));

    await this.userRepository.save(user);
    return UserResponseMapper.toResponse(user);
  }
}
