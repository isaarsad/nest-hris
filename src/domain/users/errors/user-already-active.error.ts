import { ConflictError } from '../../shared/errors/base/conflict.error.js';

export class UserAlreadyActiveError extends ConflictError {
  readonly code = 'USER_ALREADY_ACTIVE';

  constructor(username: string, id: string) {
    super(`User ${username} (ID: ${id}) is already active`);
  }
}
