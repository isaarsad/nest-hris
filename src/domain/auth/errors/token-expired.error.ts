import { UnauthorizedError } from '../../shared/errors/base/unauthorized.error.js';

export class TokenExpiredError extends UnauthorizedError {
  readonly code = 'TOKEN_EXPIRED';

  constructor() {
    super('Refresh token has expired');
  }
}
