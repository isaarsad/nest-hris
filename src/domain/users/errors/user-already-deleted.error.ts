import { ConflictError } from '../../shared/errors/base/conflict.error.js';

export class UserAlreadyDeletedError extends ConflictError {
  readonly code = 'USER_ALREADY_DELETED';

  constructor(username: string, id: string) {
    super(`User ${username} (ID: ${id}) is already deleted`);
  }
}
