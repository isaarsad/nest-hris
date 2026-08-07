import { ConflictError } from '../../shared/errors/base/conflict.error.js';

export class UserAlreadyExistsError extends ConflictError {
  readonly code = 'USER_ALREADY_EXISTS';

  constructor(field: 'username' | 'email', value: string) {
    super(`User with ${field} '${value}' already exists`);
  }
}
