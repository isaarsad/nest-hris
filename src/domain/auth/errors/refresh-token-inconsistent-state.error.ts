import { InvariantError } from '../../shared/errors/base/invariant.error.js';

export class RefreshTokenInconsistentStateError extends InvariantError {
  readonly code = 'REFRESH_TOKEN_INCONSISTENT_STATE';

  constructor(message: string) {
    super(`Inconsistent refresh token state: ${message}`);
  }
}
