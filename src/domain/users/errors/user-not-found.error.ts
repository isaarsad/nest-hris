import { NotFoundError } from '../../shared/errors/base/not-found.error.js';

export class UserNotFoundError extends NotFoundError {
  readonly code = 'USER_NOT_FOUND';

  constructor(id: string) {
    super(`User with id '${id}' not found`);
  }
}
