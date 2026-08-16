import { UserRepository } from '../../domain/users/user.repository.js';
import {
  InvalidUserRoleError,
  UserNotFoundError,
  UserPermissionDeniedError,
  UserHierarchyViolationError,
  SelfRoleChangeNotAllowedError,
} from '../../domain/users/errors/index.js';
import {
  ROLE_HIERARCHY,
  UserPermission,
  UserRole,
} from '../../domain/users/user-role-permissions.js';
import { RequestingUser } from '../../domain/users/entities/requesting-user.entity.js';

export interface ChangeUserRoleCommand {
  userId: string;
  newRole: UserRole;
}

export class ChangeUserRoleUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(
    requestingUser: RequestingUser,
    command: ChangeUserRoleCommand,
  ): Promise<void> {
    if (!command.newRole || !Object.hasOwn(ROLE_HIERARCHY, command.newRole)) {
      throw new InvalidUserRoleError(command.newRole);
    }

    const canUpdate = requestingUser.hasPermission(
      UserPermission.UPDATE_USER_ROLE,
    );
    if (!canUpdate) {
      throw new UserPermissionDeniedError('change role');
    }

    if (requestingUser.id === command.userId) {
      throw new SelfRoleChangeNotAllowedError();
    }

    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    if (!requestingUser.isSuperiorTo(user.role)) {
      throw new UserHierarchyViolationError(
        'change role',
        requestingUser.role,
        user.role,
      );
    }

    if (!requestingUser.canAssignRole(command.newRole)) {
      throw new UserHierarchyViolationError(
        'change role',
        requestingUser.role,
        command.newRole,
      );
    }
    user.changeRole(command.newRole);

    await this.userRepository.save(user);
  }
}
