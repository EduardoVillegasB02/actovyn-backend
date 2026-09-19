import { User } from '../../domain/entity';
import { UserResponseDto } from '../dto';

export class UserResponseMapper {
  static toResponse(user: User): UserResponseDto {
    return {
      id: user.id.value,
      email: user.email?.value ?? null,
      name: user.name,
      lastname: user.lastname,
      displayName: user.displayName,
      timezone: user.timezone.value,
      isGuest: user.isGuest,
      createdAt: user.createdAt,
    };
  }
}
