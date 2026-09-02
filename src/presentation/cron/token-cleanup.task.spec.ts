import { Logger } from '@nestjs/common';
import { TokenCleanupTask } from './token-cleanup.task.js';
import { DeleteExpiredTokensUseCase } from '../../application/auth/delete-expired-tokens.use-case.js';

describe('TokenCleanupTask', () => {
  let task: TokenCleanupTask;
  let useCase: DeleteExpiredTokensUseCase;
  let loggerLogSpy: ReturnType<typeof vi.spyOn>;
  let loggerErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    useCase = {
      execute: vi.fn(),
    } as unknown as DeleteExpiredTokensUseCase;

    task = new TokenCleanupTask(useCase);

    loggerLogSpy = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => {});
    loggerErrorSpy = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute use case, log progress, and not log any error on success', async () => {
    const executedAt = new Date('2026-08-27T10:00:00.000Z');
    vi.mocked(useCase.execute).mockResolvedValueOnce({
      deletedCount: 5,
      executedAt,
    });

    await task.handleExpiredTokensCleanup();

    expect(useCase.execute).toHaveBeenCalledOnce();
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Running scheduled job'),
    );
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        `5 expired token(s) deleted at ${executedAt.toISOString()}`,
      ),
    );
    expect(loggerErrorSpy).not.toHaveBeenCalled();
  });

  it('should swallow exception and log stack trace when useCase throws an Error instance', async () => {
    const error = new Error('Database connection failed');
    vi.mocked(useCase.execute).mockRejectedValueOnce(error);

    await expect(task.handleExpiredTokensCleanup()).resolves.toBeUndefined();

    expect(useCase.execute).toHaveBeenCalledOnce();
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to execute expired tokens cleanup job'),
      error.stack,
    );
  });

  it('should swallow exception and log stringified error when thrown value is not an Error', async () => {
    const rawError = 'Fatal socket hang up';
    vi.mocked(useCase.execute).mockRejectedValueOnce(rawError);

    await expect(task.handleExpiredTokensCleanup()).resolves.toBeUndefined();

    expect(useCase.execute).toHaveBeenCalledOnce();
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to execute expired tokens cleanup job'),
      'Fatal socket hang up',
    );
  });
});
