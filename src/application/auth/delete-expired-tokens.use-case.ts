import { RefreshTokenRepository } from '../../domain/auth/refresh-token.repository.js';

export interface DeleteExpiredTokensCommand {
  readonly now?: Date;
}

export interface DeleteExpiredTokensResult {
  readonly deletedCount: number;
  readonly executedAt: Date;
}

export class DeleteExpiredTokensUseCase {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async execute(
    command: DeleteExpiredTokensCommand = {},
  ): Promise<DeleteExpiredTokensResult> {
    const now = command.now ?? new Date();
    const deletedCount = await this.refreshTokenRepository.deleteExpired(now);

    return { deletedCount, executedAt: now };
  }
}
