import { UserRepository } from '../../domain/users/user.repository.js';
import {
  UserNotFoundError,
  UserPermissionDeniedError,
  UserHierarchyViolationError,
} from '../../domain/users/errors/index.js';
import { UserPermission } from '../../domain/users/user-role-permissions.js';
import { RequestingUser } from '../../domain/users/entities/requesting-user.entity.js';

export class ActivateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(requestingUser: RequestingUser, userId: string): Promise<void> {
    const canUpdate = requestingUser.hasPermission(
      UserPermission.ACTIVATE_USER,
    );
    if (!canUpdate) {
      throw new UserPermissionDeniedError('activate');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    if (!requestingUser.isSuperiorTo(user.role)) {
      throw new UserHierarchyViolationError(
        'activate',
        requestingUser.role,
        user.role,
      );
    }

    user.activate();

    await this.userRepository.save(user);
  }
}
