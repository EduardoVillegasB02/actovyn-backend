import { User as PrismaUser } from 'generated/prisma/client';
import { Id } from 'src/shared/domain/vo';
import { User } from 'src/modules/user/domain/entity';
import { Email, Password, Timezone } from 'src/modules/user/domain/vo';

export interface UserRow {
  id: string;
  email: string | null;
  password_hash: string | null;
  name: string;
  lastname: string;
  is_guest: boolean;
  timezone: string;
  created_at: Date;
  updated_at: Date;
}

export class UserPersistenceMapper {
  static toDomain(row: PrismaUser): User {
    return User.reconstitute(
      Id.create(row.id),
      row.email ? Email.create(row.email) : null,
      row.password_hash ? Password.fromHash(row.password_hash) : null,
      row.name,
      row.lastname,
      row.is_guest,
      // Una zona que ya no exista en la base de datos de zonas no debe
      // impedir leer la cuenta, así que cae a la de por defecto.
      UserPersistenceMapper.toTimezone(row.timezone),
      row.created_at,
      row.updated_at,
    );
  }

  static toPersistence(user: User): UserRow {
    return {
      id: user.id.value,
      email: user.email?.value ?? null,
      password_hash: user.password?.hash ?? null,
      name: user.name,
      lastname: user.lastname,
      is_guest: user.isGuest,
      timezone: user.timezone.value,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }

  private static toTimezone(value: string): Timezone {
    try {
      return Timezone.create(value);
    } catch {
      return Timezone.default();
    }
  }
}
