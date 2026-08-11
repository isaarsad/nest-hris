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
import { PasswordHasher } from '../../domain/shared/ports/password-hasher.port.js';

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

const HASHED_PASSWORD = '$2b$10$hashedpassword';

const makePasswordHasher = (): PasswordHasher => ({
  hash: vi.fn().mockResolvedValue(HASHED_PASSWORD),
  compare: vi.fn(),
});

const mockIdGenerator = () => 'id-123';

const makeCreateUserCommand = (
  overrides: Partial<CreateUserCommand> = {},
): CreateUserCommand => ({
  username: 'john_doe',
  email: 'john@example.com',
  passwordPlainText: 'plain-secret-123',
  role: UserRole.EMPLOYEE,
  ...overrides,
});

const makeUser = (overrides: Partial<UserProps> = {}): User =>
  new User({
    id: 'user-123',
    username: new Username('john_doe'),
    email: new Email('john@example.com'),
    passwordHash: new PasswordHash(HASHED_PASSWORD),
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
  let passwordHasher: PasswordHasher;
  let useCase: CreateUserUseCase;

  beforeEach(() => {
    userRepository = makeRepository();
    passwordHasher = makePasswordHasher();
    useCase = new CreateUserUseCase(
      userRepository,
      mockIdGenerator,
      passwordHasher,
    );
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
      expect(passwordHasher.hash).not.toHaveBeenCalled();
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

      expect(passwordHasher.hash).toHaveBeenCalledExactlyOnceWith(
        command.passwordPlainText,
      );

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
      expect(passwordHasher.hash).not.toHaveBeenCalled();
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
      expect(passwordHasher.hash).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });

  // === SUCCESSFUL CREATION ===

  describe('Successful user creation', () => {
    it('should hash the password and create, persist, and return the user with correct properties when authorized', async () => {
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

      expect(passwordHasher.hash).toHaveBeenCalledExactlyOnceWith(
        command.passwordPlainText,
      );

      expect(userRepository.save).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          id: 'id-123',
          role: command.role,
          username: expect.objectContaining({ value: command.username }),
          email: expect.objectContaining({ value: command.email }),
          passwordHash: expect.objectContaining({ value: HASHED_PASSWORD }),
        }),
      );

      expect(result.id).toBe('id-123');
      expect(result.username.value).toBe(command.username);
      expect(result.email.value).toBe(command.email);
      expect(result.role).toBe(command.role);
      expect(result.passwordHash.value).toBe(HASHED_PASSWORD);
    });
  });
});
