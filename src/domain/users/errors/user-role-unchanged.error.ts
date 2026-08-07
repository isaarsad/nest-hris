import { InvariantError } from '../../shared/errors/base/invariant.error.js';
import { UserRole } from '../user-role-permissions.js';

export class UserRoleUnchangedError extends InvariantError {
  readonly code = 'USER_ROLE_UNCHANGED';
  constructor(username: string, id: string, role: UserRole) {
    super(
      `User '${username}' (ID: ${id}) is already assigned to the role '${role}'.`,
    );
  }
}
