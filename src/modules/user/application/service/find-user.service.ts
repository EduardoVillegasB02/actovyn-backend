import { Inject, Injectable } from '@nestjs/common';
import { Id } from 'src/shared/domain/vo';
import { UserNotFoundException } from '../../domain/exception';
import { UserResponseDto } from '../dto';
import { UserResponseMapper } from '../mapper';
import { FindUserPort } from '../port/in/user.port';
import { USER_REPOSITORY_PORT, UserRepositoryPort } from '../port/out';

@Injectable()
export class FindUserService implements FindUserPort {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(Id.create(id));
    if (!user) throw new UserNotFoundException();
    return UserResponseMapper.toResponse(user);
  }
}
