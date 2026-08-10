import { UserRepository } from '../../domain/users/user.repository.js';
import {
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

export class ActivateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(requestingUser: RequestingUser, userId: string): Promise<void> {
    const canUpdate = requestingUser.hasPermission(
      UserPermission.ACTIVATE_USER,
    );
    if (!canUpdate) {
      throw new UserPermissionDeniedError('update');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const requesterRank = ROLE_HIERARCHY[requestingUser.role];
    const targetCurrentRank = ROLE_HIERARCHY[user.role];

    if (requestingUser.role !== UserRole.ROOT) {
      if (targetCurrentRank >= requesterRank) {
        throw new UserHierarchyViolationError('activate');
      }
    }

    user.activate();

    await this.userRepository.save(user);
  }
}
