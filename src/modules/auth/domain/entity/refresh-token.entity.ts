import { Id } from 'src/shared/domain/vo';

/**
 * Un refresh token emitido. Solo vive aquí su hash: si alguien se lleva la
 * tabla, no se lleva sesiones utilizables.
 *
 * Se rota en cada uso. Un token ya revocado que vuelve a aparecer significa
 * que alguien copió el original, y eso invalida toda la familia.
 */
export class RefreshToken {
  private constructor(
    private readonly _id: Id,
    private readonly _userId: Id,
    private readonly _tokenHash: string,
    private readonly _expiresAt: Date,
    private _revokedAt: Date | null,
    private readonly _createdAt: Date,
  ) {}

  static issue(
    id: Id,
    userId: Id,
    tokenHash: string,
    expiresAt: Date,
    now: Date = new Date(),
  ): RefreshToken {
    return new RefreshToken(id, userId, tokenHash, expiresAt, null, now);
  }

  static reconstitute(
    id: Id,
    userId: Id,
    tokenHash: string,
    expiresAt: Date,
    revokedAt: Date | null,
    createdAt: Date,
  ): RefreshToken {
    return new RefreshToken(
      id,
      userId,
      tokenHash,
      expiresAt,
      revokedAt,
      createdAt,
    );
  }

  revoke(now: Date = new Date()): void {
    this._revokedAt ??= now;
  }

  get isRevoked(): boolean {
    return this._revokedAt !== null;
  }

  isExpired(now: Date = new Date()): boolean {
    return this._expiresAt.getTime() <= now.getTime();
  }

  isUsable(now: Date = new Date()): boolean {
    return !this.isRevoked && !this.isExpired(now);
  }

  get id(): Id {
    return this._id;
  }

  get userId(): Id {
    return this._userId;
  }

  get tokenHash(): string {
    return this._tokenHash;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  get revokedAt(): Date | null {
    return this._revokedAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}
