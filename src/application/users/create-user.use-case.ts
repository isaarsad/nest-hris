import { User } from '../../domain/users/entities/user.entity.js';
import { UserRepository } from '../../domain/users/user.repository.js';
import {
  UserAlreadyExistsError,
  UserPermissionDeniedError,
  UserRoleHierarchyError,
} from '../../domain/users/errors/index.js';
import {
  UserPermission,
  UserRole,
} from '../../domain/users/user-role-permissions.js';
import { RequestingUser } from '../../domain/users/entities/requesting-user.entity.js';
import { PasswordHasher } from '../../domain/shared/ports/password-hasher.port.js';

export interface CreateUserCommand {
  username: string;
  email: string;
  passwordPlainText: string;
  role: UserRole;
}

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly idGenerator: () => string,
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

    const { username, email, passwordPlainText, role } = command;

    if (!requestingUser.canAssignRole(role)) {
      throw new UserRoleHierarchyError(requestingUser.role, role);
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

    const passwordHash = await this.passwordHasher.hash(passwordPlainText);

    const user = User.create({
      id: this.idGenerator(),
      username,
      email,
      passwordHash,
      role,
    });

    return this.userRepository.save(user);
  }
}
