import { InvariantError } from '../../shared/errors/base/invariant.error.js';

export class RefreshTokenInvalidPayloadError extends InvariantError {
  readonly code = 'REFRESH_TOKEN_INVALID_PAYLOAD';

  constructor(message: string = 'Invalid refresh token payload') {
    super(message);
  }
}
