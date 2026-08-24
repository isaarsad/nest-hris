import { DataSource } from 'typeorm';
import { RefreshTokenOrmEntity } from '../../src/infrastructure/database/entities/refresh-token.orm-entity.js';

export class RefreshTokenTableTestHelper {
  constructor(private readonly dataSource: DataSource) {}

  async clear() {
    await this.dataSource.query('TRUNCATE TABLE refresh_tokens CASCADE');
  }

  async insert(props: Partial<RefreshTokenOrmEntity> & { userId: string }) {
    const now = new Date();
    const defaults = {
      id: crypto.randomUUID(),
      tokenHash: 'a'.repeat(64),
      expiresAt: new Date(now.getTime() + 1000 * 60 * 60), // +1h
      absoluteExpiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30), // +30d
      revokedAt: null,
      replacedByTokenId: null,
      createdAt: now,
    };

    const data = { ...defaults, ...props };

    await this.dataSource.query(
      `
      INSERT INTO refresh_tokens
      (id, user_id, token_hash, expires_at, absolute_expires_at, revoked_at, replaced_by_token_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        data.id,
        data.userId,
        data.tokenHash,
        data.expiresAt,
        data.absoluteExpiresAt,
        data.revokedAt,
        data.replacedByTokenId,
        data.createdAt,
      ],
    );

    return data;
  }

  async findByIdRaw(id: string): Promise<RefreshTokenOrmEntity | null> {
    const rows = await this.dataSource.query<RefreshTokenOrmEntity[]>(
      `SELECT
        id,
        user_id AS "userId",
        token_hash AS "tokenHash",
        expires_at AS "expiresAt",
        absolute_expires_at AS "absoluteExpiresAt",
        revoked_at AS "revokedAt",
        replaced_by_token_id AS "replacedByTokenId",
        created_at AS "createdAt"
      FROM refresh_tokens WHERE id = $1`,
      [id],
    );

    return rows[0] || null;
  }
}
