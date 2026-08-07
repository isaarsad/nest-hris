import { ForbiddenError } from '../../shared/errors/base/forbidden.error.js';

export class UserPermissionDeniedError extends ForbiddenError {
  readonly code = 'USER_DEPARTMENT_PERMISSION_DENIED';

  constructor(action: 'create' | 'update' | 'delete' | 'view') {
    super(`You do not have permission to ${action} a user`);
  }
}
