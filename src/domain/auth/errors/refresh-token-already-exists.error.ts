import { ConflictError } from '../../shared/errors/base/conflict.error.js';

export class RefreshTokenAlreadyExistsError extends ConflictError {
  readonly code = 'REFRESH_TOKEN_ALREADY_EXISTS';

  constructor(value: string) {
    super(`Refresh token with hash '${value}' already exists`);
  }
}
