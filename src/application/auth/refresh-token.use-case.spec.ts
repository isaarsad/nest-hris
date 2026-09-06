import {
  RefreshTokenUseCase,
  RefreshTokenCommand,
} from './refresh-token.use-case.js';
import { UserRepository } from '../../domain/users/user.repository.js';
import { RefreshTokenRepository } from '../../domain/auth/refresh-token.repository.js';
import { IdGeneratorPort } from '../../domain/shared/ports/id-generator.port.js';
import { AccessTokenPort } from '../../domain/auth/ports/access-token.port.js';
import { RefreshTokenPort } from '../../domain/auth/ports/refresh-token.port.js';
import {
  TokenInvalidError,
  TokenExpiredError,
  UserInactiveError,
} from '../../domain/auth/errors/index.js';
import { UserRole } from '../../domain/users/user-role-permissions.js';
import { User, UserProps } from '../../domain/users/entities/user.entity.js';
import {
  Username,
  Email,
  PasswordHash,
} from '../../domain/shared/value-objects/index.js';
import {
  RefreshToken,
  RefreshTokenProps,
} from '../../domain/auth/entities/refresh-token.entity.js';

// ─── Mock helpers ────────────────────────────────────────────────────────────

const VALID_TOKEN_HASH = 'a'.repeat(64); // valid SHA-256 hex (64 lowercase hex chars)
const NEW_TOKEN_HASH = 'b'.repeat(64);

// Fixed "now" used across all time-sensitive tests.
// Chosen to be well in the past so future/past comparisons are unambiguous.
const NOW = new Date('2026-01-01T00:00:00.000Z');

// Dates expressed relative to NOW — readable and unambiguous
const IN_7_DAYS = new Date('2026-01-08T00:00:00.000Z');
const IN_30_DAYS = new Date('2026-01-31T00:00:00.000Z');
const IN_2_DAYS = new Date('2026-01-03T00:00:00.000Z');
const IN_1_DAY = new Date('2026-01-02T00:00:00.000Z');
const ONE_MS_AGO = new Date(NOW.getTime() - 1);

const makeUserRepository = (): UserRepository => ({
  save: vi.fn(),
  findById: vi.fn(),
  findByUsername: vi.fn(),
  findByEmail: vi.fn(),
  findAll: vi.fn(),
  existById: vi.fn(),
  existByUsername: vi.fn(),
  existByEmail: vi.fn(),
});

const makeRefreshTokenRepository = (): RefreshTokenRepository => ({
  save: vi.fn(),
  findById: vi.fn(),
  findByTokenHash: vi.fn(),
  revokeAllByUserId: vi.fn(),
  deleteExpired: vi.fn(),
  rotate: vi.fn(),
});

const makeIdGenerator = (): IdGeneratorPort => ({
  generate: vi.fn().mockReturnValue('new-refresh-token-id-456'),
});

const makeAccessTokenPort = (): AccessTokenPort => ({
  generate: vi.fn().mockResolvedValue('new-access-token-xyz'),
  verify: vi.fn(),
});

const makeRefreshTokenPort = (): RefreshTokenPort => ({
  generate: vi.fn().mockReturnValue('raw-new-refresh-token-abc'),
  hash: vi.fn().mockReturnValue(NEW_TOKEN_HASH),
  getExpiresAt: vi.fn().mockReturnValue(IN_7_DAYS),
  getAbsoluteExpiresAt: vi.fn().mockReturnValue(IN_30_DAYS),
});

const makeRefreshTokenCommand = (
  overrides: Partial<RefreshTokenCommand> = {},
): RefreshTokenCommand => ({
  refreshToken: 'raw-incoming-refresh-token',
  ...overrides,
});

const HASHED_PASSWORD = new PasswordHash(
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRzb21lc2FsdA$RdescudvJCsgt3ub+b+dWRWJTmaaJObG',
);

const makeUser = (overrides: Partial<UserProps> = {}): User =>
  new User({
    id: 'user-123',
    username: new Username('john_doe'),
    email: new Email('john@example.com'),
    passwordHash: HASHED_PASSWORD,
    role: UserRole.EMPLOYEE,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    ...overrides,
  });

// makeRefreshToken produces a valid, non-expired, non-revoked token by default.
// All date-relative props are defined in terms of NOW so tests are deterministic.
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

describe('RefreshTokenUseCase', () => {
  let userRepository: UserRepository;
  let refreshTokenRepository: RefreshTokenRepository;
  let idGenerator: IdGeneratorPort;
  let accessTokenPort: AccessTokenPort;
  let refreshTokenPort: RefreshTokenPort;
  let useCase: RefreshTokenUseCase;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    userRepository = makeUserRepository();
    refreshTokenRepository = makeRefreshTokenRepository();
    idGenerator = makeIdGenerator();
    accessTokenPort = makeAccessTokenPort();
    refreshTokenPort = makeRefreshTokenPort();

    useCase = new RefreshTokenUseCase(
      userRepository,
      refreshTokenRepository,
      idGenerator,
      accessTokenPort,
      refreshTokenPort,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // === TOKEN NOT FOUND ===

  describe('Token not found', () => {
    it('should throw TokenInvalidError when token hash is not found in repository', async () => {
      vi.mocked(refreshTokenPort.hash).mockReturnValue(VALID_TOKEN_HASH);
      vi.mocked(refreshTokenRepository.findByTokenHash).mockResolvedValue(null);

      await expect(useCase.execute(makeRefreshTokenCommand())).rejects.toThrow(
        TokenInvalidError,
      );

      expect(refreshTokenPort.hash).toHaveBeenCalledExactlyOnceWith(
        'raw-incoming-refresh-token',
      );
      expect(
        refreshTokenRepository.findByTokenHash,
      ).toHaveBeenCalledExactlyOnceWith(VALID_TOKEN_HASH);
      expect(refreshTokenRepository.revokeAllByUserId).not.toHaveBeenCalled();
      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(accessTokenPort.generate).not.toHaveBeenCalled();
      expect(refreshTokenPort.generate).not.toHaveBeenCalled();
      expect(refreshTokenRepository.rotate).not.toHaveBeenCalled();
    });
  });

  // === TOKEN REUSE DETECTION ===

  describe('Token reuse after revocation', () => {
    it('should revoke all tokens for user and throw TokenInvalidError when a revoked (but non-expired) token is reused', async () => {
      // Token is revoked but expiresAt is still in the future → wasReusedAfterRevocation() = true
      const reusedToken = makeRefreshToken({
        revokedAt: new Date('2025-12-31T12:00:00.000Z'), // revoked yesterday
        replacedByTokenId: 'some-newer-token-id',
      });

      vi.mocked(refreshTokenPort.hash).mockReturnValue(VALID_TOKEN_HASH);
      vi.mocked(refreshTokenRepository.findByTokenHash).mockResolvedValue(
        reusedToken,
      );

      await expect(useCase.execute(makeRefreshTokenCommand())).rejects.toThrow(
        TokenInvalidError,
      );

      expect(
        refreshTokenRepository.revokeAllByUserId,
      ).toHaveBeenCalledExactlyOnceWith(reusedToken.userId);
      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(accessTokenPort.generate).not.toHaveBeenCalled();
      expect(refreshTokenPort.generate).not.toHaveBeenCalled();
      expect(refreshTokenRepository.rotate).not.toHaveBeenCalled();
    });
  });

  // === EXPIRED TOKEN ===

  describe('Expired token', () => {
    it('should throw TokenExpiredError when the token has passed its expiresAt date', async () => {
      // expiresAt is 1ms before NOW — considered expired by isExpired()
      const expiredToken = makeRefreshToken({
        expiresAt: ONE_MS_AGO,
        absoluteExpiresAt: NOW, // must satisfy expiresAt <= absoluteExpiresAt
      });

      vi.mocked(refreshTokenPort.hash).mockReturnValue(VALID_TOKEN_HASH);
      vi.mocked(refreshTokenRepository.findByTokenHash).mockResolvedValue(
        expiredToken,
      );

      await expect(useCase.execute(makeRefreshTokenCommand())).rejects.toThrow(
        TokenExpiredError,
      );

      expect(refreshTokenRepository.revokeAllByUserId).not.toHaveBeenCalled();
      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(accessTokenPort.generate).not.toHaveBeenCalled();
      expect(refreshTokenPort.generate).not.toHaveBeenCalled();
      expect(refreshTokenRepository.rotate).not.toHaveBeenCalled();
    });
  });

  // === REVOKED TOKEN ===

  describe('Revoked token', () => {
    it('should throw TokenExpiredError when token is expired and revoked (isExpired checked before isRevoked)', async () => {
      // isExpired() = true AND isRevoked() = true → wasReusedAfterRevocation() = false
      // The use-case hits the isExpired() guard first, so TokenExpiredError is thrown
      const expiredRevokedToken = makeRefreshToken({
        createdAt: new Date('2020-01-01T00:00:00.000Z'),
        expiresAt: new Date('2020-01-02T00:00:00.000Z'), // expired in the distant past
        absoluteExpiresAt: new Date('2020-01-31T00:00:00.000Z'),
        revokedAt: new Date('2020-01-02T00:00:01.000Z'),
        replacedByTokenId: 'other-token-id',
      });

      vi.mocked(refreshTokenPort.hash).mockReturnValue(VALID_TOKEN_HASH);
      vi.mocked(refreshTokenRepository.findByTokenHash).mockResolvedValue(
        expiredRevokedToken,
      );

      await expect(useCase.execute(makeRefreshTokenCommand())).rejects.toThrow(
        TokenExpiredError,
      );

      expect(refreshTokenRepository.revokeAllByUserId).not.toHaveBeenCalled();
      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(accessTokenPort.generate).not.toHaveBeenCalled();
      expect(refreshTokenPort.generate).not.toHaveBeenCalled();
      expect(refreshTokenRepository.rotate).not.toHaveBeenCalled();
    });
  });

  // === USER NOT FOUND / DELETED ===

  describe('User not found or deleted', () => {
    it('should throw TokenInvalidError when user is not found in repository', async () => {
      const validToken = makeRefreshToken();
      vi.mocked(refreshTokenPort.hash).mockReturnValue(VALID_TOKEN_HASH);
      vi.mocked(refreshTokenRepository.findByTokenHash).mockResolvedValue(
        validToken,
      );
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(useCase.execute(makeRefreshTokenCommand())).rejects.toThrow(
        TokenInvalidError,
      );

      expect(userRepository.findById).toHaveBeenCalledExactlyOnceWith(
        validToken.userId,
      );
      expect(accessTokenPort.generate).not.toHaveBeenCalled();
      expect(refreshTokenPort.generate).not.toHaveBeenCalled();
      expect(refreshTokenRepository.rotate).not.toHaveBeenCalled();
    });

    it('should throw TokenInvalidError when user is soft-deleted', async () => {
      const validToken = makeRefreshToken();
      const deletedUser = makeUser({
        isActive: false,
        deletedAt: new Date('2024-06-01'),
      });

      vi.mocked(refreshTokenPort.hash).mockReturnValue(VALID_TOKEN_HASH);
      vi.mocked(refreshTokenRepository.findByTokenHash).mockResolvedValue(
        validToken,
      );
      vi.mocked(userRepository.findById).mockResolvedValue(deletedUser);

      await expect(useCase.execute(makeRefreshTokenCommand())).rejects.toThrow(
        TokenInvalidError,
      );

      expect(userRepository.findById).toHaveBeenCalledExactlyOnceWith(
        validToken.userId,
      );
      expect(accessTokenPort.generate).not.toHaveBeenCalled();
      expect(refreshTokenPort.generate).not.toHaveBeenCalled();
      expect(refreshTokenRepository.rotate).not.toHaveBeenCalled();
    });
  });

  // === INACTIVE USER ===

  describe('Inactive user', () => {
    it('should throw UserInactiveError when user account is inactive (not deleted)', async () => {
      const validToken = makeRefreshToken();
      const inactiveUser = makeUser({ isActive: false });

      vi.mocked(refreshTokenPort.hash).mockReturnValue(VALID_TOKEN_HASH);
      vi.mocked(refreshTokenRepository.findByTokenHash).mockResolvedValue(
        validToken,
      );
      vi.mocked(userRepository.findById).mockResolvedValue(inactiveUser);

      await expect(useCase.execute(makeRefreshTokenCommand())).rejects.toThrow(
        UserInactiveError,
      );

      expect(userRepository.findById).toHaveBeenCalledExactlyOnceWith(
        validToken.userId,
      );
      expect(accessTokenPort.generate).not.toHaveBeenCalled();
      expect(refreshTokenPort.generate).not.toHaveBeenCalled();
      expect(refreshTokenRepository.rotate).not.toHaveBeenCalled();
    });
  });

  // === SUCCESSFUL REFRESH ===

  describe('Successful token refresh', () => {
    it('should rotate the token and return a new accessToken and refreshToken', async () => {
      const OLD_EXPIRES_AT = new Date('2026-08-25T00:00:00.000Z');
      const NEW_EXPIRES_AT = new Date('2026-08-31T00:00:00.000Z');
      const ABSOLUTE_EXPIRES_AT = new Date('2026-09-24T00:00:00.000Z');

      const validToken = makeRefreshToken({
        expiresAt: OLD_EXPIRES_AT,
        absoluteExpiresAt: ABSOLUTE_EXPIRES_AT,
      });
      const user = makeUser();

      // First call: hash incoming token → VALID_TOKEN_HASH (for findByTokenHash lookup)
      // Second call: hash newly generated raw token → NEW_TOKEN_HASH (stored in new token)
      vi.mocked(refreshTokenPort.hash)
        .mockReturnValueOnce(VALID_TOKEN_HASH)
        .mockReturnValueOnce(NEW_TOKEN_HASH);

      vi.mocked(refreshTokenPort.getExpiresAt).mockReturnValue(NEW_EXPIRES_AT);

      vi.mocked(refreshTokenRepository.findByTokenHash).mockResolvedValue(
        validToken,
      );
      vi.mocked(userRepository.findById).mockResolvedValue(user);

      const result = await useCase.execute(makeRefreshTokenCommand());

      // Token hashing — called twice: once for lookup, once for new token
      expect(refreshTokenPort.hash).toHaveBeenNthCalledWith(
        1,
        'raw-incoming-refresh-token',
      );
      expect(refreshTokenPort.hash).toHaveBeenNthCalledWith(
        2,
        'raw-new-refresh-token-abc',
      );
      expect(
        refreshTokenRepository.findByTokenHash,
      ).toHaveBeenCalledExactlyOnceWith(VALID_TOKEN_HASH);

      // User lookup
      expect(userRepository.findById).toHaveBeenCalledExactlyOnceWith(
        validToken.userId,
      );

      // New token generation
      expect(idGenerator.generate).toHaveBeenCalledOnce();
      expect(refreshTokenPort.generate).toHaveBeenCalledOnce();
      expect(refreshTokenPort.getExpiresAt).toHaveBeenCalledOnce();

      // Access token generation
      expect(accessTokenPort.generate).toHaveBeenCalledWith({
        sub: user.id,
        role: user.role,
      });

      // Verify rotate is invoked atomically with both token entities
      expect(refreshTokenRepository.rotate).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          id: validToken.id,
          userId: user.id,
          tokenHash: VALID_TOKEN_HASH,
          expiresAt: OLD_EXPIRES_AT,
          absoluteExpiresAt: ABSOLUTE_EXPIRES_AT,
          revokedAt: NOW,
          replacedByTokenId: 'new-refresh-token-id-456',
          createdAt: validToken.createdAt,
        }),
        // New token: active, linked to the same user, created at NOW
        expect.objectContaining({
          id: 'new-refresh-token-id-456',
          userId: user.id,
          tokenHash: NEW_TOKEN_HASH,
          expiresAt: NEW_EXPIRES_AT,
          absoluteExpiresAt: ABSOLUTE_EXPIRES_AT,
          revokedAt: null,
          replacedByTokenId: null,
          createdAt: NOW,
        }),
      );

      // Return value
      expect(result).toEqual({
        accessToken: 'new-access-token-xyz',
        refreshToken: 'raw-new-refresh-token-abc',
      });
    });

    it('should cap the new token expiresAt to absoluteExpiresAt when nextExpiresAt would exceed it', async () => {
      // The token's absoluteExpiresAt is 2 days from NOW — less than the 7-day value
      // returned by refreshTokenPort.getExpiresAt(), so rotate() should cap it to 2 days.
      const user = makeUser();
      const tokenWithCloseAbsolute = makeRefreshToken({
        expiresAt: IN_1_DAY, // valid: expiresAt (1d) <= absoluteExpiresAt (2d)
        absoluteExpiresAt: IN_2_DAYS,
      });

      // First hash call: incoming token → VALID_TOKEN_HASH
      // Second hash call: new raw token → NEW_TOKEN_HASH
      vi.mocked(refreshTokenPort.hash)
        .mockReturnValueOnce(VALID_TOKEN_HASH)
        .mockReturnValueOnce(NEW_TOKEN_HASH);
      // getExpiresAt returns IN_7_DAYS (> absoluteExpiresAt IN_2_DAYS) → should be capped
      vi.mocked(refreshTokenRepository.findByTokenHash).mockResolvedValue(
        tokenWithCloseAbsolute,
      );
      vi.mocked(userRepository.findById).mockResolvedValue(user);

      await useCase.execute(makeRefreshTokenCommand());

      expect(refreshTokenRepository.rotate).toHaveBeenCalledExactlyOnceWith(
        expect.any(RefreshToken),
        expect.objectContaining({
          id: 'new-refresh-token-id-456',
          userId: user.id,
          tokenHash: NEW_TOKEN_HASH,
          expiresAt: IN_2_DAYS, // Capped to absoluteExpiresAt
          absoluteExpiresAt: IN_2_DAYS,
          revokedAt: null,
          replacedByTokenId: null,
          createdAt: NOW,
        }),
      );
    });
  });
});
