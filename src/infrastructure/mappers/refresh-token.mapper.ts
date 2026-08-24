import { RefreshToken } from '../../domain/auth/entities/refresh-token.entity.js';
import { RefreshTokenOrmEntity } from '../database/entities/refresh-token.orm-entity.js';

export class RefreshTokenMapper {
  static toDomain(orm: RefreshTokenOrmEntity): RefreshToken {
    return new RefreshToken({
      id: orm.id,
      userId: orm.userId,
      tokenHash: orm.tokenHash,
      expiresAt: orm.expiresAt,
      absoluteExpiresAt: orm.absoluteExpiresAt,
      revokedAt: orm.revokedAt,
      replacedByTokenId: orm.replacedByTokenId,
      createdAt: orm.createdAt,
    });
  }

  static toPersistence(domain: RefreshToken): RefreshTokenOrmEntity {
    const orm = new RefreshTokenOrmEntity();

    orm.id = domain.id;
    orm.userId = domain.userId;
    orm.tokenHash = domain.tokenHash;
    orm.expiresAt = domain.expiresAt;
    orm.absoluteExpiresAt = domain.absoluteExpiresAt;
    orm.revokedAt = domain.revokedAt;
    orm.replacedByTokenId = domain.replacedByTokenId;
    orm.createdAt = domain.createdAt;

    return orm;
  }
}
