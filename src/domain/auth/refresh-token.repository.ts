import { RefreshToken } from './entities/refresh-token.entity.js';

export interface RefreshTokenRepository {
  save(refreshToken: RefreshToken): Promise<void>;
  findById(id: string): Promise<RefreshToken | null>;
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  revokeAllByUserId(userId: string): Promise<void>;
  deleteExpired(now: Date): Promise<number>;
}
