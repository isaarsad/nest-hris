import { RefreshTokenRepository } from '../../domain/auth/refresh-token.repository.js';
import { RefreshTokenPort } from '../../domain/auth/ports/refresh-token.port.js';

export interface LogoutCommand {
  readonly refreshToken: string;
}

export class LogoutUseCase {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly refreshTokenPort: RefreshTokenPort,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    const tokenHash = this.refreshTokenPort.hash(command.refreshToken);

    const token = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!token || token.isRevoked()) {
      return;
    }

    token.revoke();
    await this.refreshTokenRepository.save(token);
  }
}
