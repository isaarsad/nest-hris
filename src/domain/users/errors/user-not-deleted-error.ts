import { ConflictError } from '../../shared/errors/base/conflict.error.js';

export class UserNotDeletedError extends ConflictError {
  readonly code = 'USER_NOT_DELETED';

  constructor(username: string, id: string) {
    super(`User ${username} (ID: ${id}) is not deleted`);
  }
}
