import { ForbiddenError } from '../../shared/errors/base/forbidden.error.js';

export class UserPermissionDeniedError extends ForbiddenError {
  readonly code = 'USER_PERMISSION_DENIED';

  constructor(
    action: 'create' | 'update' | 'delete' | 'view',
    target: 'a user' | 'users' = 'a user',
  ) {
    super(`You do not have permission to ${action} ${target}`);
  }
}
