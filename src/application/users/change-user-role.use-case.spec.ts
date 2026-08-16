import { vi } from 'vitest';
import {
  ChangeUserRoleUseCase,
  ChangeUserRoleCommand,
} from './change-user-role.use-case.js';
import { UserRepository } from '../../domain/users/user.repository.js';
import {
  InvalidUserRoleError,
  UserNotFoundError,
  UserPermissionDeniedError,
  UserHierarchyViolationError,
  SelfRoleChangeNotAllowedError,
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

const makeChangeUserRoleCommand = (
  overrides: Partial<ChangeUserRoleCommand> = {},
): ChangeUserRoleCommand => ({
  userId: 'user-target-123',
  newRole: UserRole.HR,
  ...overrides,
});

// ROOT (rank 40) — memiliki UPDATE_USER_ROLE permission, dapat mengubah semua role
const makeRootUser = () => new RequestingUser('user-root', UserRole.ROOT);

// ADMIN (rank 30) — memiliki UPDATE_USER_ROLE permission, hanya bisa ubah role di bawahnya
const makeAdminUser = () => new RequestingUser('user-admin', UserRole.ADMIN);

// HR (rank 20) — tidak memiliki UPDATE_USER_ROLE permission
const makeHrUser = () => new RequestingUser('user-hr', UserRole.HR);

// EMPLOYEE (rank 10) — tidak memiliki UPDATE_USER_ROLE permission
const makeEmployeeUser = () =>
  new RequestingUser('user-emp', UserRole.EMPLOYEE);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ChangeUserRoleUseCase', () => {
  let userRepository: UserRepository;
  let useCase: ChangeUserRoleUseCase;

  beforeEach(() => {
    userRepository = makeRepository();
    useCase = new ChangeUserRoleUseCase(userRepository);
  });

  // === INVALID ROLE VALIDATION ===

  describe('Invalid role validation', () => {
    it('should throw InvalidUserRoleError when newRole is an empty string', async () => {
      const requestingUser = makeRootUser();
      const command = makeChangeUserRoleCommand({ newRole: '' as UserRole });

      await expect(useCase.execute(requestingUser, command)).rejects.toThrow(
        InvalidUserRoleError,
      );

      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should throw InvalidUserRoleError when newRole is not a valid UserRole', async () => {
      const requestingUser = makeRootUser();
      const command = makeChangeUserRoleCommand({
        newRole: 'SUPER_ADMIN' as UserRole,
      });

      await expect(useCase.execute(requestingUser, command)).rejects.toThrow(
        InvalidUserRoleError,
      );

      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });

  // === PERMISSION CHECK ===

  describe('Permission check', () => {
    it.each([
      {
        role: UserRole.EMPLOYEE,
        user: makeEmployeeUser(),
      },
      { role: UserRole.HR, user: makeHrUser() },
    ])(
      'should throw UserPermissionDeniedError when requesting user is $role',
      async ({ user }) => {
        const command = makeChangeUserRoleCommand();

        await expect(useCase.execute(user, command)).rejects.toThrow(
          UserPermissionDeniedError,
        );

        expect(userRepository.findById).not.toHaveBeenCalled();
        expect(userRepository.save).not.toHaveBeenCalled();
      },
    );

    it('should proceed normally when requesting user is an ADMIN', async () => {
      const authorizedUser = makeAdminUser();
      // ADMIN (rank 30) updates EMPLOYEE (rank 10) to HR (rank 20) — valid
      const targetUser = makeUser({ role: UserRole.EMPLOYEE });
      const command = makeChangeUserRoleCommand({
        userId: targetUser.id,
        newRole: UserRole.HR,
      });

      vi.mocked(userRepository.findById).mockResolvedValue(targetUser);
      vi.mocked(userRepository.save).mockResolvedValue(targetUser);

      await expect(
        useCase.execute(authorizedUser, command),
      ).resolves.not.toThrow();

      expect(userRepository.findById).toHaveBeenCalledWith(command.userId);
      expect(userRepository.save).toHaveBeenCalledExactlyOnceWith(
        expect.any(User),
      );
    });
  });

  // === SELF-ROLE CHANGE CHECK ===

  describe('Self-role change check', () => {
    it.each([
      { role: UserRole.ROOT, makeRequesterFn: makeRootUser, id: 'user-root' },
      {
        role: UserRole.ADMIN,
        makeRequesterFn: makeAdminUser,
        id: 'user-admin',
      },
    ])(
      'should throw SelfRoleChangeNotAllowedError when $role tries to change their own role',
      async ({ makeRequesterFn, id }) => {
        const requestingUser = makeRequesterFn();
        const command = makeChangeUserRoleCommand({
          userId: id,
          newRole: UserRole.EMPLOYEE,
        });

        await expect(useCase.execute(requestingUser, command)).rejects.toThrow(
          SelfRoleChangeNotAllowedError,
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
      const command = makeChangeUserRoleCommand({ userId: 'non-existent-id' });

      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(useCase.execute(requestingUser, command)).rejects.toThrow(
        UserNotFoundError,
      );

      expect(userRepository.findById).toHaveBeenCalledWith(command.userId);
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });

  // === ROLE HIERARCHY VIOLATION ===

  describe('Role hierarchy violation', () => {
    it('should throw UserRoleHierarchyViolationError when target current role is >= requester rank', async () => {
      // Violation: ADMIN (rank 30) attempts to modify another ADMIN (rank 30)
      const requestingUser = makeAdminUser();
      const targetUser = makeUser({ role: UserRole.ADMIN });
      const command = makeChangeUserRoleCommand({
        userId: targetUser.id,
        newRole: UserRole.HR,
      });

      vi.mocked(userRepository.findById).mockResolvedValue(targetUser);

      await expect(useCase.execute(requestingUser, command)).rejects.toThrow(
        UserHierarchyViolationError,
      );

      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should throw UserRoleHierarchyViolationError when target new role is >= requester rank', async () => {
      // Violation: ADMIN (rank 30) attempts to promote EMPLOYEE (rank 10) to ADMIN (rank 30)
      const requestingUser = makeAdminUser();
      const targetUser = makeUser({ role: UserRole.EMPLOYEE });
      const command = makeChangeUserRoleCommand({
        userId: targetUser.id,
        newRole: UserRole.ADMIN,
      });

      vi.mocked(userRepository.findById).mockResolvedValue(targetUser);

      await expect(useCase.execute(requestingUser, command)).rejects.toThrow(
        UserHierarchyViolationError,
      );

      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should NOT throw hierarchy violation when ROOT changes any role', async () => {
      // ROOT (rank 40) can change ADMIN (rank 30) to any role
      const requestingUser = makeRootUser();
      const targetUser = makeUser({ role: UserRole.ADMIN });
      const command = makeChangeUserRoleCommand({
        userId: targetUser.id,
        newRole: UserRole.HR,
      });

      vi.mocked(userRepository.findById).mockResolvedValue(targetUser);
      vi.mocked(userRepository.save).mockResolvedValue(targetUser);

      await expect(
        useCase.execute(requestingUser, command),
      ).resolves.not.toThrow();

      expect(userRepository.save).toHaveBeenCalledExactlyOnceWith(
        expect.any(User),
      );
    });
  });

  // === SUCCESSFUL ROLE CHANGE ===

  describe('Successful role change', () => {
    it('should call user.changeRole and persist the updated user', async () => {
      const requestingUser = makeRootUser();
      const targetUser = makeUser({ role: UserRole.EMPLOYEE });
      const command = makeChangeUserRoleCommand({
        userId: targetUser.id,
        newRole: UserRole.HR,
      });

      vi.mocked(userRepository.findById).mockResolvedValue(targetUser);
      vi.mocked(userRepository.save).mockResolvedValue(targetUser);

      await useCase.execute(requestingUser, command);

      expect(userRepository.findById).toHaveBeenCalledWith(command.userId);
      expect(userRepository.save).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          id: targetUser.id,
          role: UserRole.HR,
        }),
      );
    });

    it('should allow ADMIN to demote HR to EMPLOYEE', async () => {
      // ADMIN (rank 30) demotes HR (rank 20) to EMPLOYEE (rank 10) — valid
      const requestingUser = makeAdminUser();
      const targetUser = makeUser({ role: UserRole.HR });
      const command = makeChangeUserRoleCommand({
        userId: targetUser.id,
        newRole: UserRole.EMPLOYEE,
      });

      vi.mocked(userRepository.findById).mockResolvedValue(targetUser);
      vi.mocked(userRepository.save).mockResolvedValue(targetUser);

      await expect(
        useCase.execute(requestingUser, command),
      ).resolves.not.toThrow();

      expect(userRepository.save).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          id: targetUser.id,
          role: UserRole.EMPLOYEE,
        }),
      );
    });
  });
});
