import { InvariantError } from '../../shared/errors/base/invariant.error.js';

export class UserRoleHierarchyViolationError extends InvariantError {
  readonly code = 'USER_ROLE_HIERARCHY_VIOLATION';

  constructor() {
    super('Cannot change role, because the role hierarchy is violated.');
  }
}
