import { ConflictError } from '../../shared/errors/base/conflict.error.js';
import { UserRole } from '../user-role-permissions.js';

export class UserRoleUnchangedError extends ConflictError {
  readonly code = 'USER_ROLE_UNCHANGED';
  constructor(username: string, id: string, role: UserRole) {
    super(
      `User '${username}' (ID: ${id}) is already assigned to the role '${role}'.`,
    );
  }
}
