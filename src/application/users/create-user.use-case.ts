import { User } from '../../domain/users/entities/user.entity.js';
import { UserRepository } from '../../domain/users/user.repository.js';
import {
  UserAlreadyExistsError,
  UserHierarchyViolationError,
  UserPermissionDeniedError,
} from '../../domain/users/errors/index.js';
import {
  UserPermission,
  UserRole,
} from '../../domain/users/user-role-permissions.js';
import { RequestingUser } from '../../domain/users/entities/requesting-user.entity.js';
import { PasswordHasher } from '../../domain/users/ports/password-hasher.port.js';
import { IdGeneratorPort } from '../../domain/shared/ports/id-generator.port.js';

export interface CreateUserCommand {
  username: string;
  email: string;
  password: string;
  role: UserRole;
}

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly idGenerator: IdGeneratorPort,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(
    requestingUser: RequestingUser,
    command: CreateUserCommand,
  ): Promise<User> {
    const canCreate = requestingUser.hasPermission(UserPermission.CREATE_USER);
    if (!canCreate) {
      throw new UserPermissionDeniedError('create');
    }

    const { username, email, password, role } = command;

    if (!requestingUser.canAssignRole(role)) {
      throw new UserHierarchyViolationError(
        'create',
        requestingUser.role,
        role,
      );
    }

    const [isUsernameUsed, isEmailUsed] = await Promise.all([
      this.userRepository.existByUsername(username),
      this.userRepository.existByEmail(email),
    ]);

    if (isUsernameUsed) {
      throw new UserAlreadyExistsError('username', username);
    }

    if (isEmailUsed) {
      throw new UserAlreadyExistsError('email', email);
    }

    const passwordHash = await this.passwordHasher.hash(password);

    const user = User.create({
      id: this.idGenerator.generate(),
      username,
      email,
      passwordHash,
      role,
    });

    return this.userRepository.save(user);
  }
}
