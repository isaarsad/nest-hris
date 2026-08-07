import { ConflictError } from '../../shared/errors/base/conflict.error.js';

export class UserAlreadyInactiveError extends ConflictError {
  readonly code = 'USER_ALREADY_INACTIVE';

  constructor(username: string, id: string) {
    super(`User ${username} (ID: ${id}) is already inactive`);
  }
}
