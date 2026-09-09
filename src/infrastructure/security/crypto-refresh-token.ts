import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import { RefreshTokenPort } from '../../domain/auth/ports/refresh-token.port.js';
import { config } from '../config/index.js';

@Injectable()
export class CryptoRefreshToken implements RefreshTokenPort {
  private readonly idleTtlMs =
    config.auth.refreshToken.idleDays * 24 * 60 * 60 * 1000;
  private readonly absoluteTtlMs =
    config.auth.refreshToken.absoluteDays * 24 * 60 * 60 * 1000;

  generate(): string {
    return randomBytes(32).toString('hex');
  }

  hash(plainToken: string): string {
    return createHash('sha256').update(plainToken).digest('hex');
  }

  getExpiresAt(): Date {
    return new Date(Date.now() + this.idleTtlMs);
  }

  getAbsoluteExpiresAt(): Date {
    return new Date(Date.now() + this.absoluteTtlMs);
  }
}
