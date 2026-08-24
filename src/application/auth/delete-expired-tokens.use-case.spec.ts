import { DeleteExpiredTokensUseCase } from './delete-expired-tokens.use-case.js';
import { RefreshTokenRepository } from '../../domain/auth/refresh-token.repository.js';

const NOW = new Date('2026-01-15T10:00:00.000Z');

const makeRefreshTokenRepository = (): RefreshTokenRepository => ({
  save: vi.fn(),
  findById: vi.fn(),
  findByTokenHash: vi.fn(),
  revokeAllByUserId: vi.fn(),
  deleteExpired: vi.fn(),
});

describe('DeleteExpiredTokensUseCase', () => {
  let refreshTokenRepository: RefreshTokenRepository;
  let useCase: DeleteExpiredTokensUseCase;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    refreshTokenRepository = makeRefreshTokenRepository();
    useCase = new DeleteExpiredTokensUseCase(refreshTokenRepository);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delete expired tokens using system current time by default when no arguments are provided', async () => {
    vi.mocked(refreshTokenRepository.deleteExpired).mockResolvedValue(25);

    const result = await useCase.execute();

    expect(
      refreshTokenRepository.deleteExpired,
    ).toHaveBeenCalledExactlyOnceWith(NOW);
    expect(result).toEqual({
      deletedCount: 25,
      executedAt: NOW,
    });
  });

  it('should delete expired tokens using explicit date provided in command', async () => {
    const customNow = new Date('2026-06-01T00:00:00.000Z');
    vi.mocked(refreshTokenRepository.deleteExpired).mockResolvedValue(5);

    const result = await useCase.execute({ now: customNow });

    expect(
      refreshTokenRepository.deleteExpired,
    ).toHaveBeenCalledExactlyOnceWith(customNow);
    expect(result).toEqual({
      deletedCount: 5,
      executedAt: customNow,
    });
  });
});
