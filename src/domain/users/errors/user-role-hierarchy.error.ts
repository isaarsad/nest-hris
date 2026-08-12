import { ForbiddenError } from '../../shared/errors/base/forbidden.error.js';
import { UserRole } from '../user-role-permissions.js';

export class UserRoleHierarchyError extends ForbiddenError {
  readonly code = 'USER_ROLE_HIERARCHY_ERROR';

  constructor(requestingRole: UserRole, targetRole: UserRole) {
    super(
      `Role '${requestingRole}' is not allowed to create or assign user with role '${targetRole}'.`,
    );
  }
}
