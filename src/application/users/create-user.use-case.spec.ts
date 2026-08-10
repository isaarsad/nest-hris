import { vi } from 'vitest';
import {
  CreateUserUseCase,
  CreateUserCommand,
} from './create-user.use-case.js';
import { UserRepository } from '../../domain/users/user.repository.js';
import {
  UserAlreadyExistsError,
  UserPermissionDeniedError,
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
  existByUsername: vi.fn().mockResolvedValue(false),
  existByEmail: vi.fn().mockResolvedValue(false),
});

const mockIdGenerator = () => 'id-123';

const makeCreateUserCommand = (
  overrides: Partial<CreateUserCommand> = {},
): CreateUserCommand => ({
  username: 'john_doe',
  email: 'john@example.com',
  passwordHash: '$2b$10$hashedpassword',
  role: UserRole.EMPLOYEE,
  ...overrides,
});

const makeUser = (overrides: Partial<UserProps> = {}): User =>
  new User({
    id: 'user-123',
    username: new Username('john_doe'),
    email: new Email('john@example.com'),
    passwordHash: new PasswordHash('$2b$10$hashedpassword'),
    role: UserRole.EMPLOYEE,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    ...overrides,
  });

// User with the ROOT role has CREATE_USER permission
const makeAuthorizedUser = () => new RequestingUser('user-root', UserRole.ROOT);

// Users with the EMPLOYEE role do not have the CREATE_USER permission
const makeUnauthorizedUser = () =>
  new RequestingUser('user-emp', UserRole.EMPLOYEE);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CreateUserUseCase', () => {
  let userRepository: UserRepository;
  let useCase: CreateUserUseCase;

  beforeEach(() => {
    userRepository = makeRepository();
    useCase = new CreateUserUseCase(userRepository, mockIdGenerator);
  });
  // === PERMISSION CHECK ===

  describe('Permission check', () => {
    it('should throw PermissionDeniedError if user does not have CREATE_USER permission', async () => {
      const unauthorizedUser = makeUnauthorizedUser();

      await expect(
        useCase.execute(unauthorizedUser, makeCreateUserCommand()),
      ).rejects.toThrow(UserPermissionDeniedError);

      expect(userRepository.existByUsername).not.toHaveBeenCalled();
      expect(userRepository.existByEmail).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should proceed normally if user has CREATE_USER permission', async () => {
      const authorizedUser = makeAuthorizedUser();
      const savedUser = makeUser();
      const command = makeCreateUserCommand();

      vi.mocked(userRepository.existByUsername).mockResolvedValue(false);
      vi.mocked(userRepository.existByEmail).mockResolvedValue(false);
      vi.mocked(userRepository.save).mockResolvedValue(savedUser);

      const result = await useCase.execute(authorizedUser, command);

      expect(userRepository.existByUsername).toHaveBeenCalledWith(
        command.username,
      );
      expect(userRepository.existByEmail).toHaveBeenCalledWith(command.email);

      expect(userRepository.save).toHaveBeenCalledExactlyOnceWith(
        expect.any(User),
      );

      expect(result).toEqual(savedUser);
    });
  });

  // === DUPLICATE VALIDATION ===

  describe('Duplicate validation', () => {
    it('should throw UserAlreadyExistsError when username is already taken', async () => {
      vi.mocked(userRepository.existByUsername).mockResolvedValue(true);
      vi.mocked(userRepository.existByEmail).mockResolvedValue(false);

      const command = makeCreateUserCommand();
      const requestingUser = makeAuthorizedUser();

      await expect(useCase.execute(requestingUser, command)).rejects.toThrow(
        new UserAlreadyExistsError('username', command.username),
      );

      expect(userRepository.existByUsername).toHaveBeenCalledWith(
        command.username,
      );
      expect(userRepository.existByEmail).toHaveBeenCalledWith(command.email);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should throw UserAlreadyExistsError when email is already taken', async () => {
      vi.mocked(userRepository.existByUsername).mockResolvedValue(false);
      vi.mocked(userRepository.existByEmail).mockResolvedValue(true);

      const command = makeCreateUserCommand();
      const requestingUser = makeAuthorizedUser();

      await expect(useCase.execute(requestingUser, command)).rejects.toThrow(
        new UserAlreadyExistsError('email', command.email),
      );

      expect(userRepository.existByUsername).toHaveBeenCalledWith(
        command.username,
      );
      expect(userRepository.existByEmail).toHaveBeenCalledWith(command.email);
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });

  // === SUCCESSFUL CREATION ===

  describe('Successful user creation', () => {
    it('should create, persist, and return the user with correct default properties when authorized', async () => {
      const authorizedUser = makeAuthorizedUser();
      const command = makeCreateUserCommand();

      vi.mocked(userRepository.save).mockImplementation((user: User) =>
        Promise.resolve(user),
      );

      const result = await useCase.execute(authorizedUser, command);

      expect(userRepository.existByUsername).toHaveBeenCalledWith(
        command.username,
      );
      expect(userRepository.existByEmail).toHaveBeenCalledWith(command.email);

      expect(userRepository.save).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          id: 'id-123',
          role: command.role,
          username: expect.objectContaining({ value: command.username }),
          email: expect.objectContaining({ value: command.email }),
        }),
      );

      expect(result.id).toBe('id-123');
      expect(result.username.value).toBe(command.username);
      expect(result.email.value).toBe(command.email);
      expect(result.role).toBe(command.role);
    });
  });
});
