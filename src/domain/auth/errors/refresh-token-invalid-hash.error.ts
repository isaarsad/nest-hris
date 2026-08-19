import { InvariantError } from '../../shared/errors/base/invariant.error.js';

export class RefreshTokenInvalidHashError extends InvariantError {
  readonly code = 'REFRESH_TOKEN_INVALID_HASH';

  constructor(
    message: string = 'Token hash must be a valid 64-character SHA-256 hex string',
  ) {
    super(message);
  }
}
