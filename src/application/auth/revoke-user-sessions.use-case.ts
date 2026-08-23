import { RefreshTokenRepository } from '../../domain/auth/refresh-token.repository.js';
import { UserRepository } from '../../domain/users/user.repository.js';
import { RequestingUser } from '../../domain/users/entities/requesting-user.entity.js';
import { UserPermission } from '../../domain/users/user-role-permissions.js';
import {
  UserPermissionDeniedError,
  UserHierarchyViolationError,
  UserNotFoundError,
} from '../../domain/users/errors/index.js';

export class RevokeUserSessionsUseCase {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    requestingUser: RequestingUser,
    targetUserId: string,
  ): Promise<void> {
    const isSelfAction = requestingUser.id === targetUserId;

    if (!isSelfAction) {
      if (!requestingUser.hasPermission(UserPermission.REVOKE_USER_SESSIONS)) {
        throw new UserPermissionDeniedError('revoke sessions of');
      }

      const targetUser = await this.userRepository.findById(targetUserId);
      if (!targetUser || targetUser.isDeleted()) {
        throw new UserNotFoundError(targetUserId);
      }

      if (!requestingUser.isSuperiorTo(targetUser.role)) {
        throw new UserHierarchyViolationError(
          'revoke sessions of',
          requestingUser.role,
          targetUser.role,
        );
      }
    }

    await this.refreshTokenRepository.revokeAllByUserId(targetUserId);
  }
}
