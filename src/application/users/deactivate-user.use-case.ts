import { UserRepository } from '../../domain/users/user.repository.js';
import {
  UserNotFoundError,
  UserPermissionDeniedError,
  UserHierarchyViolationError,
  SelfDeactivationNotAllowedError,
} from '../../domain/users/errors/index.js';
import { UserPermission } from '../../domain/users/user-role-permissions.js';
import { RequestingUser } from '../../domain/users/entities/requesting-user.entity.js';

export class DeactivateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(requestingUser: RequestingUser, userId: string): Promise<void> {
    const canUpdate = requestingUser.hasPermission(
      UserPermission.DEACTIVATE_USER,
    );
    if (!canUpdate) {
      throw new UserPermissionDeniedError('deactivate');
    }

    if (requestingUser.id === userId) {
      throw new SelfDeactivationNotAllowedError();
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    if (!requestingUser.isSuperiorTo(user.role)) {
      throw new UserHierarchyViolationError(
        'deactivate',
        requestingUser.role,
        user.role,
      );
    }

    user.deactivate();

    await this.userRepository.save(user);
  }
}
