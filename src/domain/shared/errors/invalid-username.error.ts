import { InvariantError } from './base/invariant.error.js';

export class InvalidUsernameError extends InvariantError {
  readonly code = 'INVALID_USERNAME';

  constructor(value: string) {
    super(`Invalid username: ${value}`);
  }
}
