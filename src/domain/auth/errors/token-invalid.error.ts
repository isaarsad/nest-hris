import { UnauthorizedError } from '../../shared/errors/base/unauthorized.error.js';

export class TokenInvalidError extends UnauthorizedError {
  readonly code = 'TOKEN_INVALID';

  constructor() {
    super('token is invalid or expired');
  }
}
