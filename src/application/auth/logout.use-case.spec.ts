import { LogoutUseCase, LogoutCommand } from './logout.use-case.js';
import { RefreshTokenRepository } from '../../domain/auth/refresh-token.repository.js';
import { RefreshTokenPort } from '../../domain/auth/ports/refresh-token.port.js';
import {
  RefreshToken,
  RefreshTokenProps,
} from '../../domain/auth/entities/refresh-token.entity.js';

// ─── Mock helpers ────────────────────────────────────────────────────────────

const VALID_TOKEN_HASH = 'a'.repeat(64); // valid SHA-256 hex (64 lowercase hex chars)

const NOW = new Date('2026-01-01T00:00:00.000Z');
const IN_7_DAYS = new Date('2026-01-08T00:00:00.000Z');
const IN_30_DAYS = new Date('2026-01-31T00:00:00.000Z');

const makeRefreshTokenRepository = (): RefreshTokenRepository => ({
  save: vi.fn(),
  findById: vi.fn(),
  findByTokenHash: vi.fn(),
  revokeAllByUserId: vi.fn(),
});

const makeRefreshTokenPort = (): RefreshTokenPort => ({
  generate: vi.fn(),
  hash: vi.fn().mockReturnValue(VALID_TOKEN_HASH),
  getExpiresAt: vi.fn(),
  getAbsoluteExpiresAt: vi.fn(),
});

const makeLogoutCommand = (
  overrides: Partial<LogoutCommand> = {},
): LogoutCommand => ({
  refreshToken: 'raw-incoming-refresh-token',
  ...overrides,
});

const makeRefreshToken = (
  overrides: Partial<RefreshTokenProps> = {},
): RefreshToken =>
  new RefreshToken({
    id: 'token-id-abc',
    userId: 'user-123',
    tokenHash: VALID_TOKEN_HASH,
    expiresAt: IN_7_DAYS,
    absoluteExpiresAt: IN_30_DAYS,
    revokedAt: null,
    replacedByTokenId: null,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  });

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('LogoutUseCase', () => {
  let refreshTokenRepository: RefreshTokenRepository;
  let refreshTokenPort: RefreshTokenPort;
  let useCase: LogoutUseCase;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    refreshTokenRepository = makeRefreshTokenRepository();
    refreshTokenPort = makeRefreshTokenPort();

    useCase = new LogoutUseCase(refreshTokenRepository, refreshTokenPort);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // === TOKEN NOT FOUND ===

  describe('Token not found', () => {
    it('should silently return when the token hash is not found in repository', async () => {
      vi.mocked(refreshTokenRepository.findByTokenHash).mockResolvedValue(null);

      await expect(
        useCase.execute(makeLogoutCommand()),
      ).resolves.toBeUndefined();

      expect(refreshTokenPort.hash).toHaveBeenCalledExactlyOnceWith(
        'raw-incoming-refresh-token',
      );
      expect(
        refreshTokenRepository.findByTokenHash,
      ).toHaveBeenCalledExactlyOnceWith(VALID_TOKEN_HASH);
      expect(refreshTokenRepository.save).not.toHaveBeenCalled();
    });
  });

  // === TOKEN ALREADY REVOKED ===

  describe('Token already revoked', () => {
    it('should silently return (idempotent) when the token is already revoked', async () => {
      const alreadyRevokedToken = makeRefreshToken({
        revokedAt: new Date('2025-12-31T12:00:00.000Z'),
        replacedByTokenId: 'some-newer-token-id',
      });

      vi.mocked(refreshTokenRepository.findByTokenHash).mockResolvedValue(
        alreadyRevokedToken,
      );

      await expect(
        useCase.execute(makeLogoutCommand()),
      ).resolves.toBeUndefined();

      expect(
        refreshTokenRepository.findByTokenHash,
      ).toHaveBeenCalledExactlyOnceWith(VALID_TOKEN_HASH);
      expect(refreshTokenRepository.save).not.toHaveBeenCalled();
    });
  });

  // === SUCCESSFUL LOGOUT ===

  describe('Successful logout', () => {
    it('should revoke the token and save it when a valid active token is provided', async () => {
      const token = makeRefreshToken();

      vi.mocked(refreshTokenRepository.findByTokenHash).mockResolvedValue(
        token,
      );
      vi.mocked(refreshTokenRepository.save).mockResolvedValue();

      await expect(
        useCase.execute(makeLogoutCommand()),
      ).resolves.toBeUndefined();

      expect(refreshTokenPort.hash).toHaveBeenCalledExactlyOnceWith(
        'raw-incoming-refresh-token',
      );
      expect(
        refreshTokenRepository.findByTokenHash,
      ).toHaveBeenCalledExactlyOnceWith(VALID_TOKEN_HASH);

      // Token must be revoked (revokedAt set to NOW) before being saved
      expect(refreshTokenRepository.save).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          id: token.id,
          userId: token.userId,
          tokenHash: VALID_TOKEN_HASH,
          revokedAt: NOW,
          replacedByTokenId: null,
        }),
      );
    });
  });
});
