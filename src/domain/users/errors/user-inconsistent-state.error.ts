import { InvariantError } from '../../shared/errors/base/invariant.error.js';

export class UserInconsistentStateError extends InvariantError {
  readonly code = 'USER_INCONSISTENT_STATE';

  constructor(username: string, id: string, reason: string) {
    super(`Inconsistent user state for "${username}" (id: ${id}): ${reason}`);
  }
}
