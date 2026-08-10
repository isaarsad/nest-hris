import { vi } from 'vitest';
import { DeactivateUserUseCase } from './deactivate-user.use-case.js';
import { UserRepository } from '../../domain/users/user.repository.js';
import {
  UserNotFoundError,
  UserPermissionDeniedError,
  UserHierarchyViolationError,
  SelfDeactivationNotAllowedError,
} from '../../domain/users/errors/index.js';
import { UserRole } from '../../domain/users/user-role-permissions.js';
import { RequestingUser } from '../../domain/users/entities/requesting-user.entity.js';
import { User, UserProps } from '../../domain/users/entities/user.entity.js';
import {
  Username,
  Email,
  PasswordHash,
} from '../../domain/shared/value-objects/index.js';

// ─── Mock helpers ────────────────────────────────────────────────────────────

const makeRepository = (): UserRepository => ({
  save: vi.fn(),
  findById: vi.fn(),
  findByUsername: vi.fn(),
  findByEmail: vi.fn(),
  findAll: vi.fn(),
  existById: vi.fn(),
  existByUsername: vi.fn(),
  existByEmail: vi.fn(),
});

const makeUser = (overrides: Partial<UserProps> = {}): User =>
  new User({
    id: 'user-target-123',
    username: new Username('jane_doe'),
    email: new Email('jane@example.com'),
    passwordHash: new PasswordHash('$2b$10$hashedpassword'),
    role: UserRole.EMPLOYEE,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    ...overrides,
  });

// ROOT (rank 40) — memiliki DEACTIVATE_USER permission, dapat menonaktifkan semua user
const makeRootUser = () => new RequestingUser('user-root', UserRole.ROOT);

// ADMIN (rank 30) — memiliki DEACTIVATE_USER permission, hanya bisa menonaktifkan user di bawahnya
const makeAdminUser = () => new RequestingUser('user-admin', UserRole.ADMIN);

// HR (rank 20) — memiliki DEACTIVATE_USER permission, hanya bisa menonaktifkan user di bawahnya
const makeHrUser = () => new RequestingUser('user-hr', UserRole.HR);

// EMPLOYEE (rank 10) — tidak memiliki DEACTIVATE_USER permission
const makeEmployeeUser = () =>
  new RequestingUser('user-emp', UserRole.EMPLOYEE);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DeactivateUserUseCase', () => {
  let userRepository: UserRepository;
  let useCase: DeactivateUserUseCase;

  beforeEach(() => {
    userRepository = makeRepository();
    useCase = new DeactivateUserUseCase(userRepository);
  });

  // === PERMISSION CHECK ===

  describe('Permission check', () => {
    it('should throw UserPermissionDeniedError when requesting user is EMPLOYEE', async () => {
      const requestingUser = makeEmployeeUser();

      await expect(
        useCase.execute(requestingUser, 'user-target-123'),
      ).rejects.toThrow(UserPermissionDeniedError);

      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it.each([
      { role: UserRole.ADMIN, makeRequesterFn: makeAdminUser },
      { role: UserRole.HR, makeRequesterFn: makeHrUser },
    ])(
      'should proceed normally when requesting user is $role',
      async ({ makeRequesterFn }) => {
        const requestingUser = makeRequesterFn();
        const targetUser = makeUser({ role: UserRole.EMPLOYEE });

        vi.mocked(userRepository.findById).mockResolvedValue(targetUser);
        vi.mocked(userRepository.save).mockResolvedValue(targetUser);

        await expect(
          useCase.execute(requestingUser, targetUser.id),
        ).resolves.not.toThrow();

        expect(userRepository.findById).toHaveBeenCalledWith(targetUser.id);
        expect(userRepository.save).toHaveBeenCalledExactlyOnceWith(
          expect.any(User),
        );
      },
    );
  });

  // === SELF-DEACTIVATION CHECK ===

  describe('Self-deactivation check', () => {
    it.each([
      { role: UserRole.ROOT, makeRequesterFn: makeRootUser, id: 'user-root' },
      {
        role: UserRole.ADMIN,
        makeRequesterFn: makeAdminUser,
        id: 'user-admin',
      },
      { role: UserRole.HR, makeRequesterFn: makeHrUser, id: 'user-hr' },
    ])(
      'should throw SelfDeactivationNotAllowedError for $role trying to deactivate themselves',
      async ({ makeRequesterFn, id }) => {
        const requestingUser = makeRequesterFn();
        await expect(useCase.execute(requestingUser, id)).rejects.toThrow(
          SelfDeactivationNotAllowedError,
        );

        expect(userRepository.findById).not.toHaveBeenCalled();
        expect(userRepository.save).not.toHaveBeenCalled();
      },
    );
  });

  // === USER NOT FOUND ===

  describe('User not found', () => {
    it('should throw UserNotFoundError when target user does not exist', async () => {
      const requestingUser = makeRootUser();

      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(
        useCase.execute(requestingUser, 'non-existent-id'),
      ).rejects.toThrow(UserNotFoundError);

      expect(userRepository.findById).toHaveBeenCalledWith('non-existent-id');
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });

  // === HIERARCHY VIOLATION ===

  describe('Role hierarchy violation', () => {
    it.each([
      {
        role: UserRole.ADMIN,
        makeRequesterFn: makeAdminUser,
        targetRole: UserRole.ADMIN,
      },
      {
        role: UserRole.HR,
        makeRequesterFn: makeHrUser,
        targetRole: UserRole.HR,
      },
    ])(
      'should throw UserHierarchyViolationError when $role tries to deactivate another $role (same rank)',
      async ({ makeRequesterFn, targetRole }) => {
        const requestingUser = makeRequesterFn();
        const targetUser = makeUser({
          id: 'user-target-456',
          role: targetRole,
        });

        vi.mocked(userRepository.findById).mockResolvedValue(targetUser);

        await expect(
          useCase.execute(requestingUser, targetUser.id),
        ).rejects.toThrow(UserHierarchyViolationError);

        expect(userRepository.findById).toHaveBeenCalledWith(targetUser.id);
        expect(userRepository.save).not.toHaveBeenCalled();
      },
    );

    it('should throw UserHierarchyViolationError when HR tries to deactivate an ADMIN (higher rank)', async () => {
      // Violation: HR (rank 20) attempts to deactivate ADMIN (rank 30)
      const requestingUser = makeHrUser();
      const targetUser = makeUser({
        id: 'user-target-456',
        role: UserRole.ADMIN,
      });

      vi.mocked(userRepository.findById).mockResolvedValue(targetUser);

      await expect(
        useCase.execute(requestingUser, targetUser.id),
      ).rejects.toThrow(UserHierarchyViolationError);

      expect(userRepository.findById).toHaveBeenCalledWith(targetUser.id);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should NOT throw hierarchy violation when ROOT deactivates any role', async () => {
      // ROOT (rank 40) can deactivate ADMIN (rank 30)
      const requestingUser = makeRootUser();
      const targetUser = makeUser({
        id: 'user-target-456',
        role: UserRole.ADMIN,
      });

      vi.mocked(userRepository.findById).mockResolvedValue(targetUser);
      vi.mocked(userRepository.save).mockResolvedValue(targetUser);

      await expect(
        useCase.execute(requestingUser, targetUser.id),
      ).resolves.not.toThrow();

      expect(userRepository.findById).toHaveBeenCalledWith(targetUser.id);
      expect(userRepository.save).toHaveBeenCalledExactlyOnceWith(
        expect.any(User),
      );
    });
  });

  // === SUCCESSFUL DEACTIVATION ===

  describe('Successful deactivation', () => {
    it('should call user.deactivate() and persist the updated user', async () => {
      const requestingUser = makeRootUser();
      const targetUser = makeUser({ role: UserRole.EMPLOYEE });

      vi.mocked(userRepository.findById).mockResolvedValue(targetUser);
      vi.mocked(userRepository.save).mockResolvedValue(targetUser);

      await useCase.execute(requestingUser, targetUser.id);

      expect(userRepository.findById).toHaveBeenCalledWith(targetUser.id);
      expect(userRepository.save).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          id: targetUser.id,
          isActive: false,
        }),
      );
    });

    it('should allow ADMIN to deactivate an HR user', async () => {
      // ADMIN (rank 30) deactivates HR (rank 20) — valid
      const requestingUser = makeAdminUser();
      const targetUser = makeUser({ id: 'user-target-456', role: UserRole.HR });

      vi.mocked(userRepository.findById).mockResolvedValue(targetUser);
      vi.mocked(userRepository.save).mockResolvedValue(targetUser);

      await expect(
        useCase.execute(requestingUser, targetUser.id),
      ).resolves.not.toThrow();

      expect(userRepository.save).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          id: targetUser.id,
          isActive: false,
        }),
      );
    });

    it('should allow HR to deactivate an EMPLOYEE user', async () => {
      // HR (rank 20) deactivates EMPLOYEE (rank 10) — valid
      const requestingUser = makeHrUser();
      const targetUser = makeUser({ role: UserRole.EMPLOYEE });

      vi.mocked(userRepository.findById).mockResolvedValue(targetUser);
      vi.mocked(userRepository.save).mockResolvedValue(targetUser);

      await expect(
        useCase.execute(requestingUser, targetUser.id),
      ).resolves.not.toThrow();

      expect(userRepository.save).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          id: targetUser.id,
          isActive: false,
        }),
      );
    });
  });
});
