import {
  TokenInvalidError,
  TokenExpiredError,
  UserInactiveError,
} from '../../domain/auth/errors/index.js';
import { RefreshTokenRepository } from '../../domain/auth/refresh-token.repository.js';
import { UserRepository } from '../../domain/users/user.repository.js';
import { AccessTokenPort } from '../../domain/auth/ports/access-token.port.js';
import { RefreshTokenPort } from '../../domain/auth/ports/refresh-token.port.js';
import { IdGeneratorPort } from '../../domain/shared/ports/id-generator.port.js';

export interface RefreshTokenCommand {
  readonly refreshToken: string;
}

export interface RefreshTokenResult {
  readonly accessToken: string;
  readonly refreshToken: string;
}

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly idGenerator: IdGeneratorPort,
    private readonly accessTokenPort: AccessTokenPort,
    private readonly refreshTokenPort: RefreshTokenPort,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<RefreshTokenResult> {
    const tokenHash = this.refreshTokenPort.hash(command.refreshToken);

    const token = await this.refreshTokenRepository.findByTokenHash(tokenHash);
    if (!token) {
      throw new TokenInvalidError();
    }

    if (token.wasReusedAfterRevocation()) {
      await this.refreshTokenRepository.revokeAllByUserId(token.userId);
      throw new TokenInvalidError();
    }

    if (token.isExpired()) {
      throw new TokenExpiredError();
    }

    const user = await this.userRepository.findById(token.userId);
    if (!user || user.isDeleted()) {
      throw new TokenInvalidError();
    }
    if (!user.isActive) {
      throw new UserInactiveError();
    }

    const newId = this.idGenerator.generate();
    const rawNewRefreshToken = this.refreshTokenPort.generate();
    const newTokenHash = this.refreshTokenPort.hash(rawNewRefreshToken);
    const nextExpiresAt = this.refreshTokenPort.getExpiresAt();

    const { revokedOldToken, newToken } = token.rotate({
      newId,
      newTokenHash,
      expiresAt: nextExpiresAt,
    });

    await this.refreshTokenRepository.rotate(revokedOldToken, newToken);

    const accessToken = await this.accessTokenPort.generate({
      sub: user.id,
      role: user.role,
    });

    return {
      accessToken,
      refreshToken: rawNewRefreshToken,
    };
  }
}
