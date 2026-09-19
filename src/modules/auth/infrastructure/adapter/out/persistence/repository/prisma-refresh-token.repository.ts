import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Id } from 'src/shared/domain/vo';
import { RefreshTokenRepositoryPort } from 'src/modules/auth/application/port/out';
import { RefreshToken } from 'src/modules/auth/domain/entity';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(token: RefreshToken): Promise<void> {
    const data = {
      id: token.id.value,
      user_id: token.userId.value,
      token_hash: token.tokenHash,
      expires_at: token.expiresAt,
      revoked_at: token.revokedAt,
      created_at: token.createdAt,
    };

    await this.prisma.refreshToken.upsert({
      where: { id: data.id },
      create: data,
      update: { revoked_at: data.revoked_at },
    });
  }

  async findByHash(hash: string): Promise<RefreshToken | null> {
    const row = await this.prisma.refreshToken.findUnique({
      where: { token_hash: hash },
    });
    if (!row) return null;

    return RefreshToken.reconstitute(
      Id.create(row.id),
      Id.create(row.user_id),
      row.token_hash,
      row.expires_at,
      row.revoked_at,
      row.created_at,
    );
  }

  async revokeAllForUser(userId: Id, now: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { user_id: userId.value, revoked_at: null },
      data: { revoked_at: now },
    });
  }
}
