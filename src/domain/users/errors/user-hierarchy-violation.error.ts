import { InvariantError } from '../../shared/errors/base/invariant.error.js';

export class UserHierarchyViolationError extends InvariantError {
  readonly code = 'USER_HIERARCHY_VIOLATION';

  constructor(
    action: 'change role' | 'deactivate' | 'activate' | 'delete' | 'restore',
  ) {
    super(`Cannot ${action} user because the role hierarchy is violated.`);
  }
}
