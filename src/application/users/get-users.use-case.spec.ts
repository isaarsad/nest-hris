import { GetUsersUseCase } from './get-users.use-case.js';
import { UserRepository } from '../../domain/users/user.repository.js';
import { User, UserProps } from '../../domain/users/entities/user.entity.js';
import { RequestingUser } from '../../domain/users/entities/requesting-user.entity.js';
import { UserRole } from '../../domain/users/user-role-permissions.js';
import { UserPermissionDeniedError } from '../../domain/users/errors/user-permission-denied.error.js';
import { Username } from '../../domain/shared/value-objects/index.js';
import { Email } from '../../domain/shared/value-objects/index.js';
import { PasswordHash } from '../../domain/shared/value-objects/index.js';

// ─── Mock helpers ─────────────────────────────────────────────────────────────

const mockUserRepository = (): UserRepository => ({
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
    id: 'user-123',
    username: new Username('john_doe'),
    email: new Email('john@example.com'),
    passwordHash: new PasswordHash('$2b$10$hashedpasswordvalue'),
    role: UserRole.EMPLOYEE,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    ...overrides,
  });

const makeRequestingUser = (role: UserRole): RequestingUser =>
  new RequestingUser('requester-1', role);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GetUsersUseCase', () => {
  let userRepository: UserRepository;
  let useCase: GetUsersUseCase;

  beforeEach(() => {
    userRepository = mockUserRepository();
    useCase = new GetUsersUseCase(userRepository);
  });

  // ── Happy path ───────────────────────────────────────────────────────────────

  describe('execute - happy path', () => {
    it('should return an array of User instances', async () => {
      const rawUsers = [
        makeUser({ id: 'user-1' }),
        makeUser({ id: 'user-2', username: new Username('jane_doe') }),
      ];

      vi.mocked(userRepository.findAll).mockResolvedValue(rawUsers);

      const result = await useCase.execute(makeRequestingUser(UserRole.HR));

      expect(result).toHaveLength(2);
      result.forEach((user) => expect(user).toBeInstanceOf(User));
    });

    it('should return an empty array when no users exist', async () => {
      vi.mocked(userRepository.findAll).mockResolvedValue([]);

      const result = await useCase.execute(makeRequestingUser(UserRole.HR));

      expect(result).toEqual([]);
    });

    it('should return a single User instance', async () => {
      const user = makeUser();
      vi.mocked(userRepository.findAll).mockResolvedValue([user]);

      const result = await useCase.execute(makeRequestingUser(UserRole.HR));

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(User);
    });
  });

  // ── Permission denied ─────────────────────────────────────────────────────────

  describe('execute - permission denied', () => {
    it('should throw UserPermissionDeniedError and not call repository when user lacks permission', async () => {
      await expect(
        useCase.execute(makeRequestingUser(UserRole.EMPLOYEE)),
      ).rejects.toThrow(UserPermissionDeniedError);

      expect(userRepository.findAll).not.toHaveBeenCalled();
    });
  });

  // ── Permission: HR (VIEW_USERS + VIEW_INACTIVE_USERS) ────────────────────────

  describe('execute - HR role', () => {
    it('should call findAll with includeInactive=true and includeDeleted=false', async () => {
      vi.mocked(userRepository.findAll).mockResolvedValue([]);

      await useCase.execute(makeRequestingUser(UserRole.HR));

      expect(userRepository.findAll).toHaveBeenCalledWith({
        includeInactive: true,
        includeDeleted: false,
      });
    });
  });

  // ── Permission: ADMIN (VIEW_USERS + VIEW_INACTIVE_USERS + VIEW_DELETED_USERS) ─

  describe('execute - ADMIN role', () => {
    it('should call findAll with includeInactive=true and includeDeleted=true', async () => {
      vi.mocked(userRepository.findAll).mockResolvedValue([]);

      await useCase.execute(makeRequestingUser(UserRole.ADMIN));

      expect(userRepository.findAll).toHaveBeenCalledWith({
        includeInactive: true,
        includeDeleted: true,
      });
    });
  });

  // ── Permission: ROOT (VIEW_USERS + VIEW_INACTIVE_USERS + VIEW_DELETED_USERS) ──

  describe('execute - ROOT role', () => {
    it('should call findAll with includeInactive=true and includeDeleted=true', async () => {
      vi.mocked(userRepository.findAll).mockResolvedValue([]);

      await useCase.execute(makeRequestingUser(UserRole.ROOT));

      expect(userRepository.findAll).toHaveBeenCalledWith({
        includeInactive: true,
        includeDeleted: true,
      });
    });

    it('should return all users including inactive and deleted ones', async () => {
      const activeUser = makeUser({ id: 'user-1' });
      const inactiveUser = makeUser({ id: 'user-2', isActive: false });
      const deletedUser = makeUser({
        id: 'user-3',
        isActive: false,
        deletedAt: new Date('2024-06-01'),
      });

      vi.mocked(userRepository.findAll).mockResolvedValue([
        activeUser,
        inactiveUser,
        deletedUser,
      ]);

      const result = await useCase.execute(makeRequestingUser(UserRole.ROOT));

      expect(result).toHaveLength(3);
      result.forEach((user) => expect(user).toBeInstanceOf(User));
    });
  });

  // ── Return value mapping ──────────────────────────────────────────────────────

  describe('execute - return value mapping', () => {
    it('should correctly return all User fields', async () => {
      const user = makeUser({
        id: 'user-1',
        username: new Username('john_doe'),
        email: new Email('john@example.com'),
        role: UserRole.ADMIN,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-06-01'),
        deletedAt: null,
      });

      vi.mocked(userRepository.findAll).mockResolvedValue([user]);

      const result = await useCase.execute(makeRequestingUser(UserRole.ROOT));

      expect(result).toHaveLength(1);
      const returned = result[0]!;
      expect(returned.id).toBe('user-1');
      expect(returned.username.value).toBe('john_doe');
      expect(returned.email.value).toBe('john@example.com');
      expect(returned.role).toBe(UserRole.ADMIN);
      expect(returned.isActive).toBe(true);
      expect(returned.createdAt).toEqual(new Date('2024-01-01'));
      expect(returned.updatedAt).toEqual(new Date('2024-06-01'));
      expect(returned.deletedAt).toBeNull();
    });

    it('should correctly return a deleted User with deletedAt set', async () => {
      const deletedAt = new Date('2024-07-01');
      const user = makeUser({
        id: 'user-1',
        isActive: false,
        deletedAt,
      });

      vi.mocked(userRepository.findAll).mockResolvedValue([user]);

      const result = await useCase.execute(makeRequestingUser(UserRole.ROOT));

      expect(result).toHaveLength(1);
      expect(result[0]!.deletedAt).toEqual(deletedAt);
      expect(result[0]!.isActive).toBe(false);
    });
  });

  // ── Error propagation ─────────────────────────────────────────────────────────

  describe('execute - repository error propagation', () => {
    it('should propagate errors thrown by findAll', async () => {
      const dbError = new Error('Database connection error');
      vi.mocked(userRepository.findAll).mockRejectedValue(dbError);

      await expect(
        useCase.execute(makeRequestingUser(UserRole.HR)),
      ).rejects.toThrow(dbError);
    });
  });
});
