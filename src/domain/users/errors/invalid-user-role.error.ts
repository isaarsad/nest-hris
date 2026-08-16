import { InvariantError } from '../../shared/errors/base/invariant.error.js';

export class InvalidUserRoleError extends InvariantError {
  readonly code = 'INVALID_USER_ROLE';

  constructor(role: string) {
    super(`Invalid user role: ${role}`);
  }
}
