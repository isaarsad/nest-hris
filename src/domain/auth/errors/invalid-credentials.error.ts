import { UnauthorizedError } from '../../shared/errors/base/unauthorized.error.js';

export class InvalidCredentialsError extends UnauthorizedError {
  readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    super('Invalid email or password');
  }
}
