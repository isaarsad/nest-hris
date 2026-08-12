import { ForbiddenError } from '../../shared/errors/base/forbidden.error.js';
import { UserRole } from '../user-role-permissions.js';

export type HierarchyAction =
  'create' | 'change role' | 'deactivate' | 'activate' | 'delete' | 'restore';

export class UserHierarchyViolationError extends ForbiddenError {
  readonly code = 'USER_HIERARCHY_VIOLATION';

  constructor(
    action: HierarchyAction,
    requestingRole: UserRole,
    targetRole: UserRole,
  ) {
    super(
      `Role '${requestingRole}' is not allowed to ${action} user with role '${targetRole}' due to hierarchy restrictions.`,
    );
  }
}
