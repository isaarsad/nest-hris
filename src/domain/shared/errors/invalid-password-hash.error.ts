import { InvariantError } from './base/invariant.error.js';

export class InvalidPasswordHashError extends InvariantError {
  readonly code = 'INVALID_PASSWORD_HASH';

  constructor(value: string) {
    super(`Invalid password hash: ${value}`);
  }
}
