import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Id } from 'src/shared/domain/vo';
import { UserRepositoryPort } from 'src/modules/user/application/port/out';
import { User } from 'src/modules/user/domain/entity';
import { Email } from 'src/modules/user/domain/vo';
import { UserPersistenceMapper } from '../mapper/user-persistence.mapper';

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(user: User): Promise<void> {
    const data = UserPersistenceMapper.toPersistence(user);
    await this.prisma.user.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async findById(id: Id): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id: id.value } });
    return row ? UserPersistenceMapper.toDomain(row) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { email: email.value },
    });
    return row ? UserPersistenceMapper.toDomain(row) : null;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const found = await this.prisma.user.findUnique({
      where: { email: email.value },
      select: { id: true },
    });
    return found !== null;
  }
}
