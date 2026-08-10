import { UserRepository } from '../../domain/users/user.repository.js';
import {
  InvalidUserRoleError,
  UserNotFoundError,
  UserPermissionDeniedError,
  UserHierarchyViolationError,
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
      throw new UserPermissionDeniedError('update');
    }

    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    const requesterRank = ROLE_HIERARCHY[requestingUser.role];
    const targetCurrentRank = ROLE_HIERARCHY[user.role];
    const targetNewRank = ROLE_HIERARCHY[command.newRole];

    if (requestingUser.role !== UserRole.ROOT) {
      if (targetCurrentRank >= requesterRank) {
        throw new UserHierarchyViolationError('change role');
      }
      if (targetNewRank >= requesterRank) {
        throw new UserHierarchyViolationError('change role');
      }
    }

    user.changeRole(command.newRole);

    await this.userRepository.save(user);
  }
}
