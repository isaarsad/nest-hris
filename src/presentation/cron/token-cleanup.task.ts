import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DeleteExpiredTokensUseCase } from '../../application/auth/delete-expired-tokens.use-case.js';

@Injectable()
export class TokenCleanupTask {
  private readonly logger = new Logger(TokenCleanupTask.name);

  constructor(
    private readonly deleteExpiredTokensUseCase: DeleteExpiredTokensUseCase,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'cleanup-expired-refresh-tokens',
    timeZone: 'Asia/Jakarta',
  })
  async handleExpiredTokensCleanup(): Promise<void> {
    this.logger.log(
      'Running scheduled job: cleaning up expired refresh tokens...',
    );

    try {
      const result = await this.deleteExpiredTokensUseCase.execute();
      this.logger.log(
        `Cleanup completed: ${result.deletedCount} expired token(s) deleted at ${result.executedAt.toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to execute expired tokens cleanup job',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
