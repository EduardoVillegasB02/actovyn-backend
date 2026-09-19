import { Id } from 'src/shared/domain/vo';
import { User } from '../../../domain/entity';
import { Email } from '../../../domain/vo';

export const USER_REPOSITORY_PORT = Symbol('UserRepositoryPort');

export interface UserRepositoryPort {
  save(user: User): Promise<void>;
  findById(id: Id): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  existsByEmail(email: Email): Promise<boolean>;
}
