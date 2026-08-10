import { UserRepository } from '../../domain/users/user.repository.js';
import {
  UserNotFoundError,
  UserPermissionDeniedError,
  UserHierarchyViolationError,
  SelfDeactivationNotAllowedError,
} from '../../domain/users/errors/index.js';
import {
  ROLE_HIERARCHY,
  UserPermission,
  UserRole,
} from '../../domain/users/user-role-permissions.js';
import { RequestingUser } from '../../domain/users/entities/requesting-user.entity.js';

export class DeactivateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(requestingUser: RequestingUser, userId: string): Promise<void> {
    const canUpdate = requestingUser.hasPermission(
      UserPermission.DEACTIVATE_USER,
    );
    if (!canUpdate) {
      throw new UserPermissionDeniedError('update');
    }

    if (requestingUser.id === userId) {
      throw new SelfDeactivationNotAllowedError();
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const requesterRank = ROLE_HIERARCHY[requestingUser.role];
    const targetCurrentRank = ROLE_HIERARCHY[user.role];

    if (requestingUser.role !== UserRole.ROOT) {
      if (targetCurrentRank >= requesterRank) {
        throw new UserHierarchyViolationError('deactivate');
      }
    }

    user.deactivate();

    await this.userRepository.save(user);
  }
}
