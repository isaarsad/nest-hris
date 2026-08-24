import { LoginUseCase, LoginCommand } from './login.use-case.js';
import { UserRepository } from '../../domain/users/user.repository.js';
import { RefreshTokenRepository } from '../../domain/auth/refresh-token.repository.js';
import { IdGeneratorPort } from '../../domain/shared/ports/id-generator.port.js';
import { PasswordHasher } from '../../domain/users/ports/password-hasher.port.js';
import { AccessTokenPort } from '../../domain/auth/ports/access-token.port.js';
import { RefreshTokenPort } from '../../domain/auth/ports/refresh-token.port.js';
import {
  InvalidCredentialsError,
  UserInactiveError,
} from '../../domain/auth/errors/index.js';
import { UserRole } from '../../domain/users/user-role-permissions.js';
import { User, UserProps } from '../../domain/users/entities/user.entity.js';
import {
  Username,
  Email,
  PasswordHash,
} from '../../domain/shared/value-objects/index.js';

// ─── Mock helpers ────────────────────────────────────────────────────────────

const VALID_TOKEN_HASH = 'a'.repeat(64); // valid SHA-256 hex (64 lowercase hex chars)

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
});

const makeIdGenerator = (): IdGeneratorPort => ({
  generate: vi.fn().mockReturnValue('refresh-token-id-123'),
});

const makePasswordHasher = (): PasswordHasher => ({
  hash: vi.fn(),
  compare: vi.fn().mockResolvedValue(true),
});

const makeAccessTokenPort = (): AccessTokenPort => ({
  generate: vi.fn().mockResolvedValue('access-token-xyz'),
  verify: vi.fn(),
});

const makeRefreshTokenPort = (): RefreshTokenPort => ({
  generate: vi.fn().mockReturnValue('raw-refresh-token-abc'),
  hash: vi.fn().mockReturnValue(VALID_TOKEN_HASH),
  getExpiresAt: vi
    .fn()
    .mockReturnValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days from now
  getAbsoluteExpiresAt: vi
    .fn()
    .mockReturnValue(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
});

const makeLoginCommand = (
  overrides: Partial<LoginCommand> = {},
): LoginCommand => ({
  email: 'john@example.com',
  password: 'plain-secret-123',
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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('LoginUseCase', () => {
  let userRepository: UserRepository;
  let refreshTokenRepository: RefreshTokenRepository;
  let idGenerator: IdGeneratorPort;
  let passwordHasher: PasswordHasher;
  let accessTokenPort: AccessTokenPort;
  let refreshTokenPort: RefreshTokenPort;
  let useCase: LoginUseCase;

  beforeEach(() => {
    userRepository = makeUserRepository();
    refreshTokenRepository = makeRefreshTokenRepository();
    idGenerator = makeIdGenerator();
    passwordHasher = makePasswordHasher();
    accessTokenPort = makeAccessTokenPort();
    refreshTokenPort = makeRefreshTokenPort();

    useCase = new LoginUseCase(
      userRepository,
      refreshTokenRepository,
      idGenerator,
      passwordHasher,
      accessTokenPort,
      refreshTokenPort,
    );
  });

  // === INVALID CREDENTIALS ===

  describe('Invalid credentials', () => {
    it('should throw InvalidCredentialsError when user is not found (mitigates timing-attack)', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      // passwordHasher.compare still runs (timing-attack mitigation), returns false for null user path
      vi.mocked(passwordHasher.compare).mockResolvedValue(false);

      await expect(useCase.execute(makeLoginCommand())).rejects.toThrow(
        InvalidCredentialsError,
      );

      // compare must always be called even when user is null
      expect(passwordHasher.compare).toHaveBeenCalledExactlyOnceWith(
        makeLoginCommand().password,
        expect.any(PasswordHash),
      );
      expect(accessTokenPort.generate).not.toHaveBeenCalled();
      expect(refreshTokenPort.generate).not.toHaveBeenCalled();
      expect(refreshTokenPort.hash).not.toHaveBeenCalled();
      expect(refreshTokenPort.getExpiresAt).not.toHaveBeenCalled();
      expect(idGenerator.generate).not.toHaveBeenCalled();
      expect(refreshTokenRepository.save).not.toHaveBeenCalled();
    });

    it('should throw InvalidCredentialsError when password is incorrect', async () => {
      const user = makeUser();
      vi.mocked(userRepository.findByEmail).mockResolvedValue(user);
      vi.mocked(passwordHasher.compare).mockResolvedValue(false);

      await expect(useCase.execute(makeLoginCommand())).rejects.toThrow(
        InvalidCredentialsError,
      );

      expect(passwordHasher.compare).toHaveBeenCalledExactlyOnceWith(
        makeLoginCommand().password,
        user.passwordHash,
      );
      expect(accessTokenPort.generate).not.toHaveBeenCalled();
      expect(refreshTokenPort.generate).not.toHaveBeenCalled();
      expect(refreshTokenPort.hash).not.toHaveBeenCalled();
      expect(refreshTokenPort.getExpiresAt).not.toHaveBeenCalled();
      expect(idGenerator.generate).not.toHaveBeenCalled();
      expect(refreshTokenRepository.save).not.toHaveBeenCalled();
    });

    it('should throw InvalidCredentialsError when user is soft-deleted', async () => {
      const deletedUser = makeUser({
        isActive: false,
        deletedAt: new Date('2024-06-01'),
      });
      vi.mocked(userRepository.findByEmail).mockResolvedValue(deletedUser);
      vi.mocked(passwordHasher.compare).mockResolvedValue(true);

      await expect(useCase.execute(makeLoginCommand())).rejects.toThrow(
        InvalidCredentialsError,
      );

      expect(accessTokenPort.generate).not.toHaveBeenCalled();
      expect(refreshTokenPort.generate).not.toHaveBeenCalled();
      expect(refreshTokenPort.hash).not.toHaveBeenCalled();
      expect(refreshTokenPort.getExpiresAt).not.toHaveBeenCalled();
      expect(idGenerator.generate).not.toHaveBeenCalled();
      expect(refreshTokenRepository.save).not.toHaveBeenCalled();
    });
  });

  // === INACTIVE USER ===

  describe('Inactive user', () => {
    it('should throw UserInactiveError when user account is inactive (not deleted)', async () => {
      const inactiveUser = makeUser({ isActive: false });
      vi.mocked(userRepository.findByEmail).mockResolvedValue(inactiveUser);
      vi.mocked(passwordHasher.compare).mockResolvedValue(true);

      await expect(useCase.execute(makeLoginCommand())).rejects.toThrow(
        UserInactiveError,
      );

      expect(passwordHasher.compare).toHaveBeenCalledOnce();
      expect(accessTokenPort.generate).not.toHaveBeenCalled();
      expect(refreshTokenPort.generate).not.toHaveBeenCalled();
      expect(refreshTokenPort.hash).not.toHaveBeenCalled();
      expect(refreshTokenPort.getExpiresAt).not.toHaveBeenCalled();
      expect(idGenerator.generate).not.toHaveBeenCalled();
      expect(refreshTokenRepository.save).not.toHaveBeenCalled();
    });
  });

  // === SUCCESSFUL LOGIN ===

  describe('Successful login', () => {
    it('should return accessToken, refreshToken, and user data on valid credentials', async () => {
      const user = makeUser();
      vi.mocked(userRepository.findByEmail).mockResolvedValue(user);
      vi.mocked(passwordHasher.compare).mockResolvedValue(true);

      const command = makeLoginCommand({
        email: 'john@example.com',
        password: 'my-secret',
      });
      const result = await useCase.execute(command);

      expect(userRepository.findByEmail).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ value: 'john@example.com' }),
      );
      expect(passwordHasher.compare).toHaveBeenCalledExactlyOnceWith(
        'my-secret',
        user.passwordHash,
      );

      expect(refreshTokenPort.generate).toHaveBeenCalledOnce();
      expect(refreshTokenPort.hash).toHaveBeenCalledExactlyOnceWith(
        'raw-refresh-token-abc',
      );
      expect(result).toEqual({
        accessToken: 'access-token-xyz',
        refreshToken: 'raw-refresh-token-abc',
        user: {
          id: user.id,
          email: user.email.value,
          username: user.username.value,
          role: user.role,
        },
      });
      expect(refreshTokenPort.getExpiresAt).toHaveBeenCalledOnce();
      expect(refreshTokenPort.getAbsoluteExpiresAt).toHaveBeenCalledOnce();

      expect(accessTokenPort.generate).toHaveBeenCalledWith({
        sub: user.id,
        role: user.role,
      });

      expect(idGenerator.generate).toHaveBeenCalledOnce();
      expect(refreshTokenRepository.save).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          id: 'refresh-token-id-123',
          userId: user.id,
          tokenHash: VALID_TOKEN_HASH,
          expiresAt: expect.any(Date),
          absoluteExpiresAt: expect.any(Date),
          revokedAt: null,
          replacedByTokenId: null,
          createdAt: expect.any(Date),
        }),
      );
    });
  });
});
