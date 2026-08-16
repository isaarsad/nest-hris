import { UserRepository } from '../../domain/users/user.repository.js';
import { RequestingUser } from '../../domain/users/entities/requesting-user.entity.js';
import { UserPermission } from '../../domain/users/user-role-permissions.js';
import { User } from '../../domain/users/entities/user.entity.js';
import { UserPermissionDeniedError } from '../../domain/users/errors/user-permission-denied.error.js';

export class GetUsersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(requestingUser: RequestingUser): Promise<User[]> {
    if (!requestingUser.hasPermission(UserPermission.VIEW_USERS)) {
      throw new UserPermissionDeniedError('view', 'users');
    }

    const includeInactive = requestingUser.hasPermission(
      UserPermission.VIEW_INACTIVE_USERS,
    );
    const includeDeleted = requestingUser.hasPermission(
      UserPermission.VIEW_DELETED_USERS,
    );

    const users = await this.userRepository.findAll({
      includeInactive,
      includeDeleted,
    });

    return users;
  }
}
