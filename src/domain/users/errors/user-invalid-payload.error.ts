import { InvariantError } from '../../shared/errors/base/invariant.error.js';

export class UserInvalidPayloadError extends InvariantError {
  readonly code = 'USER_INVALID_PAYLOAD';

  constructor() {
    super('User must have id, name, username, email, and password');
  }
}
