import { RevokeUserSessionsUseCase } from './revoke-user-sessions.use-case.js';
import { RefreshTokenRepository } from '../../domain/auth/refresh-token.repository.js';
import { UserRepository } from '../../domain/users/user.repository.js';
import { RequestingUser } from '../../domain/users/entities/requesting-user.entity.js';
import { UserRole } from '../../domain/users/user-role-permissions.js';
import { User, UserProps } from '../../domain/users/entities/user.entity.js';
import {
  Username,
  Email,
  PasswordHash,
} from '../../domain/shared/value-objects/index.js';
import {
  UserPermissionDeniedError,
  UserHierarchyViolationError,
  UserNotFoundError,
} from '../../domain/users/errors/index.js';

// ─── Mock helpers ────────────────────────────────────────────────────────────

const makeRefreshTokenRepository = (): RefreshTokenRepository => ({
  save: vi.fn(),
  findById: vi.fn(),
  findByTokenHash: vi.fn(),
  revokeAllByUserId: vi.fn(),
  deleteExpired: vi.fn(),
});

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

const HASHED_PASSWORD = new PasswordHash(
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRzb21lc2FsdA$RdescudvJCsgt3ub+b+dWRWJTmaaJObG',
);

const makeUser = (overrides: Partial<UserProps> = {}): User =>
  new User({
    id: 'target-user-456',
    username: new Username('jane_doe'),
    email: new Email('jane@example.com'),
    passwordHash: HASHED_PASSWORD,
    role: UserRole.EMPLOYEE,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    ...overrides,
  });

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RevokeUserSessionsUseCase', () => {
  let refreshTokenRepository: RefreshTokenRepository;
  let userRepository: UserRepository;
  let useCase: RevokeUserSessionsUseCase;

  beforeEach(() => {
    refreshTokenRepository = makeRefreshTokenRepository();
    userRepository = makeUserRepository();

    useCase = new RevokeUserSessionsUseCase(
      refreshTokenRepository,
      userRepository,
    );
  });

  // === SELF-REVOCATION ===

  describe('Self-revocation', () => {
    it('should revoke own sessions without any permission or hierarchy check', async () => {
      const requestingUser = new RequestingUser('user-123', UserRole.EMPLOYEE);

      vi.mocked(refreshTokenRepository.revokeAllByUserId).mockResolvedValue();

      await expect(
        useCase.execute(requestingUser, 'user-123'),
      ).resolves.toBeUndefined();

      // userRepository must NOT be consulted for a self-action
      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(
        refreshTokenRepository.revokeAllByUserId,
      ).toHaveBeenCalledExactlyOnceWith('user-123');
    });
  });

  // === PERMISSION DENIED ===

  describe('Permission denied', () => {
    it('should throw UserPermissionDeniedError when requesting user lacks REVOKE_USER_SESSIONS permission', async () => {
      // EMPLOYEE has no permissions at all
      const requestingUser = new RequestingUser(
        'admin-user-1',
        UserRole.EMPLOYEE,
      );

      await expect(
        useCase.execute(requestingUser, 'target-user-456'),
      ).rejects.toThrow(UserPermissionDeniedError);

      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(refreshTokenRepository.revokeAllByUserId).not.toHaveBeenCalled();
    });
  });

  // === TARGET USER NOT FOUND ===

  describe('Target user not found', () => {
    it('should throw UserNotFoundError when target user does not exist in the repository', async () => {
      // ADMIN has REVOKE_USER_SESSIONS permission
      const requestingUser = new RequestingUser('admin-user-1', UserRole.ADMIN);

      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(
        useCase.execute(requestingUser, 'target-user-456'),
      ).rejects.toThrow(UserNotFoundError);

      expect(userRepository.findById).toHaveBeenCalledExactlyOnceWith(
        'target-user-456',
      );
      expect(refreshTokenRepository.revokeAllByUserId).not.toHaveBeenCalled();
    });

    it('should throw UserNotFoundError when target user is soft-deleted', async () => {
      const requestingUser = new RequestingUser('admin-user-1', UserRole.ADMIN);
      const deletedUser = makeUser({
        deletedAt: new Date('2025-01-01'),
        isActive: false,
      });

      vi.mocked(userRepository.findById).mockResolvedValue(deletedUser);

      await expect(
        useCase.execute(requestingUser, 'target-user-456'),
      ).rejects.toThrow(UserNotFoundError);

      expect(userRepository.findById).toHaveBeenCalledExactlyOnceWith(
        'target-user-456',
      );
      expect(refreshTokenRepository.revokeAllByUserId).not.toHaveBeenCalled();
    });
  });

  // === HIERARCHY VIOLATION ===

  describe('Hierarchy violation', () => {
    it('should throw UserHierarchyViolationError when requesting user is not superior to the target user', async () => {
      // HR (rank 20) cannot revoke sessions of ADMIN (rank 30)
      const requestingUser = new RequestingUser('hr-user-1', UserRole.HR);
      const targetUser = makeUser({ role: UserRole.ADMIN });

      vi.mocked(userRepository.findById).mockResolvedValue(targetUser);

      await expect(
        useCase.execute(requestingUser, 'target-user-456'),
      ).rejects.toThrow(UserHierarchyViolationError);

      expect(userRepository.findById).toHaveBeenCalledExactlyOnceWith(
        'target-user-456',
      );
      expect(refreshTokenRepository.revokeAllByUserId).not.toHaveBeenCalled();
    });

    it('should throw UserHierarchyViolationError when requesting user has the same role as the target user', async () => {
      // ADMIN (rank 30) cannot revoke sessions of another ADMIN (rank 30)
      const requestingUser = new RequestingUser('admin-user-1', UserRole.ADMIN);
      const targetUser = makeUser({ role: UserRole.ADMIN });

      vi.mocked(userRepository.findById).mockResolvedValue(targetUser);

      await expect(
        useCase.execute(requestingUser, 'target-user-456'),
      ).rejects.toThrow(UserHierarchyViolationError);

      expect(userRepository.findById).toHaveBeenCalledExactlyOnceWith(
        'target-user-456',
      );
      expect(refreshTokenRepository.revokeAllByUserId).not.toHaveBeenCalled();
    });
  });

  // === SUCCESSFUL REVOCATION (other user) ===

  describe('Successful revocation of another user', () => {
    it('should revoke all sessions of target user when requesting user has permission and is superior', async () => {
      // ADMIN (rank 30) can revoke sessions of EMPLOYEE (rank 10)
      const requestingUser = new RequestingUser('admin-user-1', UserRole.ADMIN);
      const targetUser = makeUser({ role: UserRole.EMPLOYEE });

      vi.mocked(userRepository.findById).mockResolvedValue(targetUser);
      vi.mocked(refreshTokenRepository.revokeAllByUserId).mockResolvedValue();

      await expect(
        useCase.execute(requestingUser, 'target-user-456'),
      ).resolves.toBeUndefined();

      expect(userRepository.findById).toHaveBeenCalledExactlyOnceWith(
        'target-user-456',
      );
      expect(
        refreshTokenRepository.revokeAllByUserId,
      ).toHaveBeenCalledExactlyOnceWith('target-user-456');
    });
  });
});
