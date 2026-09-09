import { Injectable } from '@nestjs/common';
import { RefreshTokenRepository } from '../../domain/auth/refresh-token.repository.js';
import { RefreshToken } from '../../domain/auth/entities/refresh-token.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshTokenOrmEntity } from '../database/entities/refresh-token.orm-entity.js';
import { QueryFailedError, Repository } from 'typeorm';
import { RefreshTokenMapper } from '../mappers/refresh-token.mapper.js';
import {
  RefreshTokenAlreadyExistsError,
  TokenInvalidError,
} from '../../domain/auth/errors/index.js';

@Injectable()
export class TypeOrmRefreshTokenRepository implements RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshTokenOrmEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenOrmEntity>,
  ) {}

  async save(refreshToken: RefreshToken): Promise<void> {
    try {
      const ormEntity = RefreshTokenMapper.toPersistence(refreshToken);
      await this.refreshTokenRepository.save(ormEntity);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const driverError = error.driverError as {
          code?: string;
          constraint?: string;
        };

        if (driverError.code === '23505') {
          throw new RefreshTokenAlreadyExistsError(refreshToken.tokenHash);
        }
      }

      throw error;
    }
  }

  async findById(id: string): Promise<RefreshToken | null> {
    const record = await this.refreshTokenRepository.findOneBy({ id });
    return record ? RefreshTokenMapper.toDomain(record) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const record = await this.refreshTokenRepository.findOneBy({ tokenHash });
    return record ? RefreshTokenMapper.toDomain(record) : null;
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.refreshTokenRepository
      .createQueryBuilder()
      .update(RefreshTokenOrmEntity)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  async deleteExpired(now: Date): Promise<number> {
    const result = await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .from(RefreshTokenOrmEntity)
      .where('expires_at <= :now', { now })
      .execute();

    return result.affected ?? 0;
  }

  async rotate(
    revokedOldToken: RefreshToken,
    newToken: RefreshToken,
  ): Promise<void> {
    try {
      await this.refreshTokenRepository.manager.transaction(
        async (txManager) => {
          const updateResult = await txManager
            .createQueryBuilder()
            .update(RefreshTokenOrmEntity)
            .set({
              revokedAt: revokedOldToken.revokedAt,
              replacedByTokenId: revokedOldToken.replacedByTokenId,
            })
            .where('id = :id', { id: revokedOldToken.id })
            .andWhere('revoked_at IS NULL')
            .execute();

          if (updateResult.affected === 0) {
            throw new TokenInvalidError();
          }

          const newOrmEntity = RefreshTokenMapper.toPersistence(newToken);
          await txManager.save(RefreshTokenOrmEntity, newOrmEntity);
        },
      );
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const driverError = error.driverError as {
          code?: string;
          constraint?: string;
        };
        if (driverError.code === '23505') {
          throw new RefreshTokenAlreadyExistsError(newToken.tokenHash);
        }
      }

      throw error;
    }
  }
}
